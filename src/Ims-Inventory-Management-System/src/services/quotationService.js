import { supabase } from '../supabaseClient';

const mapQuotationRow = (item) => {
  if (!item) return null;
  const details = item.details || {};
  const basic = details.basicInfo || {};
  const other = details.otherInfo || {};
  const sum = details.summary || {};

  let itemsList = item.items || details.items || [];

  // If no items in JSON but we have individual item columns, reconstruct the item line
  if (itemsList.length === 0 && item.item_code) {
    itemsList = [{
      id: Date.now(),
      type: 'item',
      itemCode: item.item_code || '',
      description: item.item_description || '',
      quantity: item.item_quantity || 0,
      unitPrice: item.item_unit_price || 0,
      discountPercent: item.item_discount_percent || 0,
      taxPercent: item.item_tax_percent || 0,
      netAmount: item.item_net_amount || 0
    }];
  }

  let state = item.customer_state || other.state || '-';
  if (!item.customer_state && basic.cityState) {
    state = basic.cityState.includes('/')
      ? basic.cityState.split('/')[1]?.trim()
      : basic.cityState;
  }

  return {
    ...details,
    id: item.id,
    quotationNo: item.quotation_no,
    customerName: item.customer_name || basic.customer || '',
    date: item.date,
    status: item.status,
    supplyStatus: item.supply_status,

    customer_address: item.customer_address || basic.address || '',
    customer_area_pin_code: item.customer_area_pin_code || basic.areaPinCode || '',
    customer_city_state: item.customer_city_state || basic.cityState || '',
    customer_state: item.customer_state || basic.state || '',
    customer_email: item.customer_email || basic.email || '',
    customer_mobile: item.customer_mobile || basic.mobile || '',
    validity_date: item.validity_date || basic.validityDate || '',
    price_list: item.price_list || basic.priceList || '',
    payment_terms: item.payment_terms || basic.paymentTerms || '',
    gross_amount: item.gross_amount || sum.grossAmount || 0,
    discount_amount: item.discount_amount || sum.discountAmount || 0,
    tax_amount: item.tax_amount || sum.taxAmount || 0,
    round_off_amount: item.round_off_amount || sum.roundOffAmount || 0,
    total_amount: item.total_amount || sum.totalAmount || 0,

    items: itemsList,

    item_code: item.item_code || '',
    item_description: item.item_description || '',
    item_quantity: item.item_quantity || 0,
    item_unit_price: item.item_unit_price || 0,
    item_discount_percent: item.item_discount_percent || 0,
    item_tax_percent: item.item_tax_percent || 0,
    item_net_amount: item.item_net_amount || 0,

    details: details,
    state: state,
    mobileNumber: item.customer_mobile || basic.mobile || other.mobile || '-',
    salesPerson: other.salesPerson || 'Admin',
    totalAmount: item.total_amount || sum.totalAmount || 0
  };
};

export const getQuotations = async () => {
  const { data, error } = await supabase
    .from('quotation')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching quotations:', error);
    return [];
  }
  return data.map(mapQuotationRow);
};

export const createQuotation = async (data) => {
  const { data: lastRecord } = await supabase
    .from('quotation')
    .select('quotation_no')
    .order('created_at', { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (lastRecord && lastRecord.length > 0 && lastRecord[0].quotation_no) {
    const match = lastRecord[0].quotation_no.match(/\d+$/);
    if (match) nextNum = parseInt(match[0], 10) + 1;
  }
  const docNo = `QUOT-${String(nextNum).padStart(4, '0')}`;

  const d = data.details || {};
  const basicInfo = d.basicInfo || {};
  const summary = d.summary || {};

  const firstItem = (d.items && d.items.length > 0)
    ? d.items[0]
    : (data.items && data.items.length > 0 ? data.items[0] : {});

  // Only include columns that actually exist in the quotation table
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

    // Store full details as JSONB — only safe structured object, never the whole spread
    details: data.details || {}
  };

  // Clean undefined values
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

  return mapQuotationRow(result);
};

export const updateQuotation = async (id, updates) => {
  const updateData = {};

  if (updates.status) updateData.status = updates.status;
  if (updates.supplyStatus) updateData.supply_status = updates.supplyStatus;
  if (updates.customerName || updates.customer)
    updateData.customer_name = updates.customerName || updates.customer;
  if (updates.details) updateData.details = updates.details;

  // If nothing specific was set, only save the details JSONB (never spread whole updates as top-level)
  if (Object.keys(updateData).length === 0) updateData.details = updates.details || {};

  const d = updates.details || updates || {};
  const basicInfo = d.basicInfo || {};
  const otherInfo = d.otherInfo || {};
  const summary = d.summary || {};

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

  const itemsList = d.items || updates.items || [];
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

  // Clean undefined values
  const cleanUpdateData = Object.fromEntries(
    Object.entries(updateData).filter(([, v]) => v !== undefined)
  );

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
  return mapQuotationRow(result);
};

export const deleteQuotation = async (id) => {
  const { error } = await supabase.from('quotation').delete().eq('id', String(id));
  if (error) throw error;
  return true;
};
