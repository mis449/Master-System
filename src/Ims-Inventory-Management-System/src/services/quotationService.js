import { supabase } from '../supabaseClient';
import { computeOrderProgress, buildInvoicedLines, mergeInvoicedLines } from '../utils/orderProgress';

// Columns a list row actually renders. Deliberately excludes the `details` JSONB
// and the quotation_items join: `details` still carries a legacy copy of every
// item line (with thumbnails) on older records — ~300KB/row, 16MB for a page of
// 50. Full records are loaded one at a time via getQuotationById when a row is
// opened. `details->otherInfo` is small and is needed for the Sales Person cell.
const LIST_COLUMNS = [
  'id',
  'quotation_no',
  'date',
  'status',
  'supply_status',
  'customer_name',
  'customer_state',
  'customer_city_state',
  'customer_mobile',
  'total_amount',
  'type_of_quotation',
  'otherInfo:details->otherInfo',
  // Small pre-computed {orderedQty, invoicedQty, pendingQty} summary written on
  // save, so the Order list can show Pending without pulling details.items.
  'orderProgress:details->orderProgress'
].join(',');

const EMPTY_TAB_COUNTS = {
  Active: 0, Accepted: 0, Rejected: 0, Confirmed: 0, 'In Progress': 0, Completed: 0
};

/**
 * Which stored `status` values belong to each list tab.
 * 'Challan Submitted' is a legacy status: raising a challan no longer changes the
 * order status, but existing records still carry it and an order with a challan
 * and no invoice belongs in Confirmed.
 */
const TAB_STATUSES = {
  Confirmed: ['Confirmed', 'Challan Submitted'],
  Completed: ['Completed', 'Final']
};

const applyTabFilter = (query, activeTab) => {
  if (activeTab === 'All') return query;
  const statuses = TAB_STATUSES[activeTab];
  return statuses ? query.in('status', statuses) : query.eq('status', activeTab);
};

const deriveState = (state, cityState) => {
  if (state) return state;
  if (cityState) {
    return cityState.includes('/') ? cityState.split('/')[1]?.trim() : cityState;
  }
  return '-';
};

const applySearch = (query, searchQuery) => {
  if (!searchQuery) return query;
  const q = `%${searchQuery}%`;
  return query.or(`quotation_no.ilike.${q},customer_name.ilike.${q},customer_mobile.ilike.${q}`);
};

// Shape for list/table rows only. Has no `details` or `items` — call
// getQuotationById before handing a row to a form modal.
const mapQuotationListRow = (item) => {
  if (!item) return null;
  const other = item.otherInfo || {};
  const progress = item.orderProgress || {};

  let state = deriveState(item.customer_state, item.customer_city_state);
  if (state === '-') state = other.state || '-';

  return {
    id: item.id,
    quotationNo: item.quotation_no,
    customerName: item.customer_name || '',
    date: item.date,
    status: item.status,
    supplyStatus: item.supply_status,
    state,
    mobileNumber: item.customer_mobile || other.mobile || '-',
    salesPerson: other.salesPerson || 'Admin',
    quortPerson: other.quortPerson || '',
    type_of_quotation: item.type_of_quotation || '',
    totalAmount: item.total_amount || 0,
    orderedQty: Number(progress.orderedQty || 0),
    invoicedQty: Number(progress.invoicedQty || 0),
    pendingQty: Number(progress.pendingQty || 0),
    // Orders saved before invoicedQty tracking existed have no summary; the list
    // shows '-' rather than a misleading 0 pending.
    hasProgress: Boolean(item.orderProgress),
    isListRow: true
  };
};

const mapQuotationRow = (item) => {
  if (!item) return null;
  const details = item.details || {};
  const other = details.otherInfo || {};

  const basic = {
    customer: item.customer_name || details.basicInfo?.customer || '',
    address: item.customer_address || details.basicInfo?.address || '',
    areaPinCode: item.customer_area_pin_code || details.basicInfo?.areaPinCode || '',
    cityState: item.customer_city_state || details.basicInfo?.cityState || '',
    state: item.customer_state || details.basicInfo?.state || '',
    email: item.customer_email || details.basicInfo?.email || '',
    mobile: item.customer_mobile || details.basicInfo?.mobile || '',
    validityDate: item.validity_date || details.basicInfo?.validityDate || '',
    priceList: item.price_list || details.basicInfo?.priceList || '',
    paymentTerms: item.payment_terms || details.basicInfo?.paymentTerms || '',
    typeOfQuotation: item.type_of_quotation || details.basicInfo?.typeOfQuotation || ''
  };

  const sum = {
    grossAmount: item.gross_amount || details.summary?.grossAmount || 0,
    discountAmount: item.discount_amount || details.summary?.discountAmount || 0,
    taxAmount: item.tax_amount || details.summary?.taxAmount || 0,
    roundOffAmount: item.round_off_amount || details.summary?.roundOffAmount || 0,
    totalAmount: item.total_amount || details.summary?.totalAmount || 0
  };

  let itemsList = [];
  if (item.quotation_items && item.quotation_items.length > 0) {
    // The relational table has no columns for the order-tracking fields
    // (orderedQty / invoicedQty / dispatchedQty / dispatchQty / stock) — those
    // live only in details.items. Carry them across, or invoiced progress would
    // be silently dropped on every reload.
    const trackingByLine = new Map();
    const trackingByCode = new Map();
    (details.items || []).forEach(line => {
      if (!line) return;
      // Deliberately NOT carrying orderedQty over: the quoted qty is the stored
      // `quantity` column, so editing a quoted qty (5 -> 4) takes effect on the
      // next read instead of being overridden by a stale snapshot.
      const tracking = {
        invoicedQty: line.invoicedQty,
        dispatchedQty: line.dispatchedQty,
        dispatchQty: line.dispatchQty,
        stock: line.stock
      };
      if (line.id !== undefined && line.id !== null) trackingByLine.set(String(line.id), tracking);
      const code = String(line.itemCode || '').trim().toUpperCase();
      if (code && !trackingByCode.has(code)) trackingByCode.set(code, tracking);
    });

    itemsList = item.quotation_items.map(qi => {
      const code = String(qi.item_code || '').trim().toUpperCase();
      const tracking = trackingByLine.get(String(qi.id)) || trackingByCode.get(code) || {};
      const base = {
        id: qi.id,
        type: qi.item_type || 'item',
        itemCode: qi.item_code || '',
        description: qi.description || '',
        quantity: Number(qi.quantity || 0),
        unitPrice: Number(qi.unit_price || 0),
        discountPercent: Number(qi.discount_percent || 0),
        taxPercent: Number(qi.tax_percent || 0),
        netAmount: Number(qi.net_amount || 0),
        addDiscount: Number(qi.add_discount || 0),
        thumbnail: qi.thumbnail || ''
      };
      Object.entries(tracking).forEach(([key, value]) => {
        if (value !== undefined && value !== null) base[key] = value;
      });
      return base;
    });
  } else if (details.items && details.items.length > 0) {
    itemsList = details.items;
  } else if (item.item_code) {
    itemsList = [{
      id: Date.now(),
      type: 'item',
      itemCode: item.item_code || '',
      description: item.item_description || '',
      quantity: item.item_quantity || 0,
      unitPrice: item.item_unit_price || 0,
      discountPercent: item.item_discount_percent || 0,
      taxPercent: item.item_tax_percent || 0,
      netAmount: item.item_net_amount || 0,
      addDiscount: item.item_add_discount || 0
    }];
  }

  // Re-attach persisted per-line invoiced quantities. Item lines usually come
  // back from quotation_items, which has no column for them.
  itemsList = mergeInvoicedLines(itemsList, details.invoicedLines);

  let state = deriveState(basic.state, basic.cityState);
  if (state === '-') state = other.state || '-';

  const newDetails = {
    ...details,
    basicInfo: basic,
    summary: sum,
    items: itemsList
  };

  return {
    ...newDetails,
    id: item.id,
    quotationNo: item.quotation_no,
    customerName: basic.customer,
    date: item.date,
    status: item.status,
    supplyStatus: item.supply_status,

    customer_address: basic.address,
    customer_area_pin_code: basic.areaPinCode,
    customer_city_state: basic.cityState,
    customer_state: basic.state,
    customer_email: basic.email,
    customer_mobile: basic.mobile,
    validity_date: basic.validityDate,
    price_list: basic.priceList,
    payment_terms: basic.paymentTerms,
    type_of_quotation: basic.typeOfQuotation,
    gross_amount: sum.grossAmount,
    discount_amount: sum.discountAmount,
    tax_amount: sum.taxAmount,
    round_off_amount: sum.roundOffAmount,
    total_amount: sum.totalAmount,

    items: itemsList,

    details: newDetails,
    state: state,
    mobileNumber: basic.mobile || other.mobile || '-',
    salesPerson: other.salesPerson || 'Admin',
    totalAmount: sum.totalAmount
  };
};

/**
 * Server-side paginated list fetch.
 * Returns light rows by default (see LIST_COLUMNS). Pass `light: false` only if
 * the caller genuinely needs every item line for the whole page.
 */
export const getQuotations = async ({ page = 1, limit = 50, searchQuery = '', activeTab = 'All', light = true } = {}) => {
  let query = supabase
    .from('quotation')
    .select(light ? LIST_COLUMNS : '*, quotation_items(*)', { count: 'exact' });

  query = applyTabFilter(query, activeTab);
  query = applySearch(query, searchQuery);
  
  // Hide revisions from the main list view, EXCEPT when viewing specific status tabs (like Accepted).
  // Revisions are generally accessed via the Versions history, but an Accepted revision should be visible in the Accepted tab.
  if (activeTab === 'All' || activeTab === 'Active') {
    query = query.not('quotation_no', 'ilike', '%-R%');
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching quotations:', error);
    return { data: [], count: 0 };
  }

  return {
    data: data.map(light ? mapQuotationListRow : mapQuotationRow),
    count: count || 0
  };
};

/** Full record (details + all item lines) for a single quotation. */
export const getQuotationById = async (id) => {
  if (!id) return null;
  const { data, error } = await supabase
    .from('quotation')
    .select('*, quotation_items(*)')
    .eq('id', String(id))
    .single();

  if (error) {
    console.error('Error fetching quotation by id:', error);
    throw error;
  }

  return mapQuotationRow(data);
};

export const getAllQuotations = async () => {
  const { data, error } = await supabase
    .from('quotation')
    .select('*, quotation_items(*)')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('Error fetching all quotations:', error);
    return [];
  }
  
  return data.map(mapQuotationRow);
};

/**
 * Full record looked up by quotation number. Used to walk the
 * invoice -> challan.order_no -> quotation chain when crediting invoiced qty.
 */
export const getQuotationByNo = async (quotationNo) => {
  const no = String(quotationNo || '').trim();
  if (!no) return null;

  const { data, error } = await supabase
    .from('quotation')
    .select('*, quotation_items(*)')
    .eq('quotation_no', no)
    .limit(1);

  if (error) {
    console.error('Error fetching quotation by number:', error);
    return null;
  }

  return data && data.length ? mapQuotationRow(data[0]) : null;
};

/**
 * Tab counts, one head-only count query per requested status.
 * Counting server-side (instead of pulling every row's status and tallying in
 * JS) keeps the payload at zero bytes and stays correct past PostgREST's
 * default 1000-row response cap.
 */
export const getQuotationCounts = async (searchQuery = '', statuses = ['Active', 'Accepted', 'Rejected']) => {
  const entries = await Promise.all(statuses.map(async (tab) => {
    let query = supabase.from('quotation').select('id', { count: 'exact', head: true });
    query = applyTabFilter(query, tab);
    if (tab === 'All' || tab === 'Active') {
      query = query.not('quotation_no', 'ilike', '%-R%');
    }

    const { count, error } = await applySearch(query, searchQuery);
    if (error) {
      console.error(`Error counting quotations for tab ${tab}:`, error);
      return [tab, 0];
    }
    return [tab, count || 0];
  }));

  return { ...EMPTY_TAB_COUNTS, ...Object.fromEntries(entries) };
};

/**
 * Revision history for a quotation base number — light rows, since the history modal only
 * shows summary fields. Open a revision through getQuotationById.
 */
export const getQuotationHistory = async (baseNo) => {
  if (!baseNo) return [];
  const { data, error } = await supabase
    .from('quotation')
    .select(LIST_COLUMNS)
    .ilike('quotation_no', `${baseNo}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching quotation history:', error);
    return [];
  }

  return data.map(mapQuotationListRow);
};

export const createQuotation = async (data) => {
  const { data: allRecords } = await supabase
    .from('quotation')
    .select('quotation_no');

  let nextNum = 1;
  if (allRecords && allRecords.length > 0) {
    let maxBase = 0;
    allRecords.forEach(r => {
      const match = r.quotation_no?.match(/QUOT-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxBase) maxBase = num;
      }
    });
    nextNum = maxBase + 1;
  }
  const docNo = `QUOT-${String(nextNum).padStart(4, '0')}`;

  const d = data.details || {};
  const basicInfo = d.basicInfo || {};
  const summary = d.summary || {};

  const itemsList = d.items || data.items || [];
  const firstItem = itemsList.length > 0 ? itemsList[0] : {};

  // Clean JSON so redundant data is not saved
  const cleanDetails = { ...d };
  delete cleanDetails.basicInfo;
  delete cleanDetails.summary;
  delete cleanDetails.items;
  // Keep the Order-list progress summary in step with the item lines here, so
  // every save path gets it without having to remember to compute it.
  cleanDetails.orderProgress = computeOrderProgress(itemsList);
  // Per-line invoiced qty must live outside `items` (deleted above) and outside
  // `orderProgress` (which the Order list selects and should stay tiny).
  cleanDetails.invoicedLines = buildInvoicedLines(itemsList);

  const insertData = {
    id: String(Date.now()),
    quotation_no: docNo,
    customer_name: data.customerName || data.customer || basicInfo.customer || '',
    date: data.date || new Date().toISOString().split('T')[0],
    status: data.status || 'Active',
    supply_status: data.supplyStatus || '-',

    customer_address: data.customer_address || basicInfo.address || '',
    customer_area_pin_code: data.customer_area_pin_code || basicInfo.areaPinCode || '',
    customer_city_state: data.customer_city_state || basicInfo.cityState || '',
    customer_state: data.customer_state || basicInfo.state || '',
    customer_email: data.customer_email || basicInfo.email || '',
    customer_mobile: data.customer_mobile || basicInfo.mobile || '',
    validity_date: data.validity_date || basicInfo.validityDate || '',
    price_list: data.price_list || basicInfo.priceList || '',
    payment_terms: data.payment_terms || basicInfo.paymentTerms || '',
    type_of_quotation: data.type_of_quotation || basicInfo.typeOfQuotation || '',

    gross_amount: Number(data.gross_amount ?? summary.grossAmount ?? 0),
    discount_amount: Number(data.discount_amount ?? summary.discountAmount ?? 0),
    tax_amount: Number(data.tax_amount ?? summary.taxAmount ?? 0),
    round_off_amount: Number(data.round_off_amount ?? summary.roundOffAmount ?? 0),
    total_amount: Number(data.total_amount ?? summary.totalAmount ?? 0),

    item_code: firstItem.itemCode ?? '',
    item_description: firstItem.description ?? '',
    item_quantity: Number(firstItem.quantity ?? 0),
    item_unit_price: Number(firstItem.unitPrice ?? 0),
    item_discount_percent: Number(firstItem.discountPercent ?? 0),
    item_tax_percent: Number(firstItem.taxPercent ?? 0),
    item_net_amount: Number(firstItem.netAmount ?? 0),

    details: cleanDetails
  };

  const cleanInsertData = Object.fromEntries(
    Object.entries(insertData).filter(([, v]) => v !== undefined)
  );

  const { data: result, error } = await supabase
    .from('quotation')
    .insert([cleanInsertData])
    .select()
    .single();

  if (error) {
    console.error('⚡ Supabase INSERT error details →', JSON.stringify(error, null, 2));
    throw error;
  }

  // Insert items securely into new relational table
  if (itemsList.length > 0) {
    const qItems = itemsList.map(item => ({
      id: String(item.id || Date.now() + Math.random()),
      quotation_id: result.id,
      item_type: item.type || 'item',
      item_code: item.itemCode || '',
      description: item.description || '',
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unitPrice || 0),
      discount_percent: Number(item.discountPercent || 0),
      tax_percent: Number(item.taxPercent || 0),
      net_amount: Number(item.netAmount || 0),
      add_discount: Number(item.addDiscount || 0),
      thumbnail: item.thumbnail || ''
    }));
    const { error: itemsError } = await supabase.from('quotation_items').insert(qItems);
    if (itemsError) throw itemsError;
    result.quotation_items = qItems;
  } else {
    result.quotation_items = [];
  }

  return mapQuotationRow(result);
};

export const updateQuotation = async (id, updates, isRevision = false) => {
  const updateData = {};

  if (updates.status) updateData.status = updates.status;
  if (updates.supplyStatus) updateData.supply_status = updates.supplyStatus;
  if (updates.customerName || updates.customer)
    updateData.customer_name = updates.customerName || updates.customer;

  const d = updates.details || updates || {};
  const basicInfo = d.basicInfo || {};
  const otherInfo = d.otherInfo || {};
  const summary = d.summary || {};
  const itemsList = d.items || updates.items || [];

  const cleanDetails = { ...d };
  delete cleanDetails.basicInfo;
  delete cleanDetails.summary;
  delete cleanDetails.items;
  // Only recompute when this update actually carries item lines. A status-only
  // update must not blank out an existing summary.
  if (itemsList.length > 0) {
    cleanDetails.orderProgress = computeOrderProgress(itemsList);
    // Per-line invoiced qty must live outside `items` (deleted above) and outside
    // `orderProgress` (which the Order list selects and should stay tiny).
    cleanDetails.invoicedLines = buildInvoicedLines(itemsList);
  }

  if (updates.details) {
    updateData.details = cleanDetails;
  } else if (Object.keys(updateData).length === 0) {
    updateData.details = cleanDetails;
  }

  const customerAddress = updates.customer_address || updates.customerAddress || basicInfo.address;
  if (customerAddress !== undefined) updateData.customer_address = customerAddress;

  const customerAreaPinCode = updates.customer_area_pin_code || updates.areaPinCode || basicInfo.areaPinCode;
  if (customerAreaPinCode !== undefined) updateData.customer_area_pin_code = customerAreaPinCode;

  const customerCityState = updates.customer_city_state || updates.cityState || basicInfo.cityState;
  if (customerCityState !== undefined) updateData.customer_city_state = customerCityState;

  const customerState = updates.customer_state || updates.state || basicInfo.state || otherInfo.state;
  if (customerState !== undefined) updateData.customer_state = customerState;

  const customerEmail = updates.customer_email || updates.customerEmail || basicInfo.email;
  if (customerEmail !== undefined) updateData.customer_email = customerEmail;

  const customerMobile = updates.customer_mobile || updates.mobileNumber || updates.mobile || basicInfo.mobile || otherInfo.mobile;
  if (customerMobile !== undefined) updateData.customer_mobile = customerMobile;

  const validityDate = updates.validity_date || updates.validityDate || basicInfo.validityDate;
  if (validityDate !== undefined) updateData.validity_date = validityDate;

  const priceList = updates.price_list || updates.priceList || basicInfo.priceList;
  if (priceList !== undefined) updateData.price_list = priceList;

  const paymentTerms = updates.payment_terms || updates.paymentTerms || basicInfo.paymentTerms;
  if (paymentTerms !== undefined) updateData.payment_terms = paymentTerms;

  const typeOfQuotation = updates.type_of_quotation || updates.typeOfQuotation || basicInfo.typeOfQuotation;
  if (typeOfQuotation !== undefined) updateData.type_of_quotation = typeOfQuotation;

  const grossAmount = updates.gross_amount ?? updates.grossAmount ?? summary.grossAmount;
  if (grossAmount !== undefined) updateData.gross_amount = Number(grossAmount);

  const discountAmount = updates.discount_amount ?? updates.discountAmount ?? summary.discountAmount;
  if (discountAmount !== undefined) updateData.discount_amount = Number(discountAmount);

  const taxAmount = updates.tax_amount ?? updates.taxAmount ?? summary.taxAmount;
  if (taxAmount !== undefined) updateData.tax_amount = Number(taxAmount);

  const roundOffAmount = updates.round_off_amount ?? updates.roundOffAmount ?? summary.roundOffAmount;
  if (roundOffAmount !== undefined) updateData.round_off_amount = Number(roundOffAmount);

  const totalAmount = updates.total_amount ?? updates.totalAmount ?? summary.totalAmount;
  if (totalAmount !== undefined) updateData.total_amount = Number(totalAmount);

  if (itemsList.length > 0) {
    const firstItem = itemsList[0];
    updateData.item_code = firstItem.itemCode ?? '';
    updateData.item_description = firstItem.description ?? '';
    updateData.item_quantity = Number(firstItem.quantity ?? 0);
    updateData.item_unit_price = Number(firstItem.unitPrice ?? 0);
    updateData.item_discount_percent = Number(firstItem.discountPercent ?? 0);
    updateData.item_tax_percent = Number(firstItem.taxPercent ?? 0);
    updateData.item_net_amount = Number(firstItem.netAmount ?? 0);
  }

  const cleanUpdateData = Object.fromEntries(
    Object.entries(updateData).filter(([, v]) => v !== undefined)
  );

  if (!isRevision) {
    const { data: result, error } = await supabase
      .from('quotation')
      .update(cleanUpdateData)
      .eq('id', String(id))
      .select()
      .single();

    if (error) {
      console.error('⚡ Supabase UPDATE error details →', JSON.stringify(error, null, 2));
      throw error;
    }

    if (itemsList.length > 0 || updates.items || updates.details?.items) {
      // Clear existing items and insert new
      await supabase.from('quotation_items').delete().eq('quotation_id', String(id));
      if (itemsList.length > 0) {
        const qItems = itemsList.map(item => ({
          id: String(item.id || Date.now() + Math.random()),
          quotation_id: result.id,
          item_type: item.type || 'item',
          item_code: item.itemCode || '',
          description: item.description || '',
          quantity: Number(item.quantity || 0),
          unit_price: Number(item.unitPrice || 0),
          discount_percent: Number(item.discountPercent || 0),
          tax_percent: Number(item.taxPercent || 0),
          net_amount: Number(item.netAmount || 0),
          add_discount: Number(item.addDiscount || 0),
          thumbnail: item.thumbnail || ''
        }));
        await supabase.from('quotation_items').insert(qItems);
        result.quotation_items = qItems;
      } else {
        result.quotation_items = [];
      }
    }

    return mapQuotationRow(result);
  }

  // REVISION LOGIC
  const { data: existing, error: fetchErr } = await supabase
    .from('quotation')
    .select('*')
    .eq('id', String(id))
    .single();

  if (fetchErr) {
    console.error('Error fetching existing quotation for update:', fetchErr);
    throw fetchErr;
  }

  const baseNoMatch = existing.quotation_no.match(/^(QUOT-\d+)(?:-R(\d+))?$/);
  let newNo = existing.quotation_no + '-R1';
  if (baseNoMatch) {
    const base = baseNoMatch[1];
    const rev = baseNoMatch[2] ? parseInt(baseNoMatch[2], 10) : 0;
    newNo = `${base}-R${rev + 1}`;
  }

  const insertData = { ...existing, ...cleanUpdateData };
  insertData.id = String(Date.now());
  insertData.quotation_no = newNo;
  delete insertData.created_at;
  delete insertData.updated_at;

  const { data: result, error } = await supabase
    .from('quotation')
    .insert([insertData])
    .select()
    .single();

  if (error) {
    console.error('⚡ Supabase INSERT (Revision) error details →', JSON.stringify(error, null, 2));
    throw error;
  }

  // Insert cloned items
  if (itemsList.length > 0) {
    const qItems = itemsList.map(item => ({
      id: String(Date.now() + Math.random()), // Force new IDs for revision
      quotation_id: result.id,
      item_type: item.type || 'item',
      item_code: item.itemCode || '',
      description: item.description || '',
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unitPrice || 0),
      discount_percent: Number(item.discountPercent || 0),
      tax_percent: Number(item.taxPercent || 0),
      net_amount: Number(item.netAmount || 0),
      add_discount: Number(item.addDiscount || 0),
      thumbnail: item.thumbnail || ''
    }));
    await supabase.from('quotation_items').insert(qItems);
    result.quotation_items = qItems;
  }

  return mapQuotationRow(result);
};

export const deleteQuotation = async (id) => {
  const { error } = await supabase.from('quotation').delete().eq('id', String(id));
  if (error) throw error;
  return true;
};
