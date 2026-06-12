import { supabase } from '../supabaseClient';

export const getSalesReturns = async () => {
  const { data, error } = await supabase.from('scales_return').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error("Error fetching sales returns:", error);
    return [];
  }
  return data.map(item => {
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
       state = basic.cityState.includes('/') ? basic.cityState.split('/')[1]?.trim() : basic.cityState;
    }

    return {
      ...details,
      id: item.id,
      SalesReturnNo: item.return_no,
      customerName: item.customer_name || basic.customer || '',
      date: item.date,
      status: item.status,
      
      // Mapped columns
      customer_address: item.customer_address || basic.address || '',
      customer_area_pin_code: item.customer_area_pin_code || basic.areaPinCode || '',
      customer_city_state: item.customer_city_state || basic.cityState || '',
      customer_state: item.customer_state || basic.state || '',
      customer_email: item.customer_email || basic.email || '',
      customer_mobile: item.customer_mobile || basic.mobile || '',
      validity_date: item.validity_date || basic.validityDate || '',
      price_list: item.price_list || basic.priceList || '',
      payment_terms: item.payment_terms || basic.paymentTerms || '',
      internal_notes: item.internal_notes || other.internalNotes || '',
      remarks: item.remarks || details.notes?.remarks || '',
      terms_conditions: item.terms_conditions || details.notes?.termsAndConditions || '',
      gross_amount: item.gross_amount || sum.grossAmount || 0,
      discount_amount: item.discount_amount || sum.discountAmount || 0,
      tax_amount: item.tax_amount || sum.taxAmount || 0,
      round_off_amount: item.round_off_amount || sum.roundOffAmount || 0,
      total_amount: item.total_amount || sum.totalAmount || 0,
      ref_invoice: item.ref_invoice || details.refInvoice || '',

      items: itemsList,

      // Export individual item fields just in case UI wants to read them directly
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
  });
};

export const createSalesReturn = async (data) => {
  const { data: lastRecord } = await supabase.from('scales_return').select('return_no').order('created_at', { ascending: false }).limit(1);
  let nextNum = 1;
  if (lastRecord && lastRecord.length > 0 && lastRecord[0].return_no) {
    const match = lastRecord[0].return_no.match(/\d+$/);
    if (match) nextNum = parseInt(match[0], 10) + 1;
  }
  const docNo = `SR-${String(nextNum).padStart(4, '0')}`;
  
  const d = data.details || {};
  const basicInfo = d.basicInfo || {};
  const otherInfo = d.otherInfo || {};
  const notes = d.notes || {};
  const summary = d.summary || {};
  
  const firstItem = (d.items && d.items.length > 0) ? d.items[0] : (data.items && data.items.length > 0 ? data.items[0] : {});
  
  const insertData = {
    id: String(Date.now()),
    return_no: docNo,
    customer_name: data.customerName || data.customer || basicInfo.customer || '',
    date: data.date || new Date().toISOString().split('T')[0],
    status: data.status || 'Active',
    
    customer_address: data.customer_address || basicInfo.address || '',
    customer_area_pin_code: data.customer_area_pin_code || basicInfo.areaPinCode || '',
    customer_city_state: data.customer_city_state || basicInfo.cityState || '',
    customer_state: data.customer_state || basicInfo.state || '',
    customer_email: data.customer_email || basicInfo.email || '',
    customer_mobile: data.customer_mobile || basicInfo.mobile || '',
    validity_date: data.validity_date || basicInfo.validityDate || '',
    price_list: data.price_list || basicInfo.priceList || '',
    payment_terms: data.payment_terms || basicInfo.paymentTerms || '',
    
    internal_notes: data.internal_notes || otherInfo.internalNotes || '',
    remarks: data.remarks || notes.remarks || '',
    terms_conditions: data.terms_conditions || notes.termsAndConditions || '',
    
    gross_amount: data.gross_amount || summary.grossAmount || 0,
    discount_amount: data.discount_amount || summary.discountAmount || 0,
    tax_amount: data.tax_amount || summary.taxAmount || 0,
    round_off_amount: data.round_off_amount || summary.roundOffAmount || 0,
    total_amount: data.total_amount || summary.totalAmount || 0,
    ref_invoice: data.ref_invoice || d.refInvoice || '',
    
    item_code: firstItem.itemCode || '',
    item_description: firstItem.description || '',
    item_quantity: firstItem.quantity || 0,
    item_unit_price: firstItem.unitPrice || 0,
    item_discount_percent: firstItem.discountPercent || 0,
    item_tax_percent: firstItem.taxPercent || 0,
    item_net_amount: firstItem.netAmount || 0,

    details: data.details || data
  };

  const { data: result, error } = await supabase.from('scales_return').insert([insertData]).select().single();
  if (error) throw error;
  
  return { ...data, id: result.id, SalesReturnNo: result.return_no };
};

export const updateSalesReturn = async (id, updates) => {
  const updateData = {};
  if (updates.status) updateData.status = updates.status;
  if (updates.customerName || updates.customer) updateData.customer_name = updates.customerName || updates.customer;
  if (updates.details) updateData.details = updates.details;
  
  if (Object.keys(updateData).length === 0) updateData.details = updates;

  const d = updates.details || updates || {};
  const basicInfo = d.basicInfo || {};
  const otherInfo = d.otherInfo || {};
  const notes = d.notes || {};
  const summary = d.summary || {};
  
  if (updates.customer_address !== undefined || basicInfo.address !== undefined) updateData.customer_address = updates.customer_address || basicInfo.address;
  if (updates.customer_area_pin_code !== undefined || basicInfo.areaPinCode !== undefined) updateData.customer_area_pin_code = updates.customer_area_pin_code || basicInfo.areaPinCode;
  if (updates.customer_city_state !== undefined || basicInfo.cityState !== undefined) updateData.customer_city_state = updates.customer_city_state || basicInfo.cityState;
  if (updates.customer_state !== undefined || basicInfo.state !== undefined) updateData.customer_state = updates.customer_state || basicInfo.state;
  if (updates.customer_email !== undefined || basicInfo.email !== undefined) updateData.customer_email = updates.customer_email || basicInfo.email;
  if (updates.customer_mobile !== undefined || basicInfo.mobile !== undefined) updateData.customer_mobile = updates.customer_mobile || basicInfo.mobile;
  if (updates.validity_date !== undefined || basicInfo.validityDate !== undefined) updateData.validity_date = updates.validity_date || basicInfo.validityDate;
  if (updates.price_list !== undefined || basicInfo.priceList !== undefined) updateData.price_list = updates.price_list || basicInfo.priceList;
  if (updates.payment_terms !== undefined || basicInfo.paymentTerms !== undefined) updateData.payment_terms = updates.payment_terms || basicInfo.paymentTerms;
  
  if (updates.internal_notes !== undefined || otherInfo.internalNotes !== undefined) updateData.internal_notes = updates.internal_notes || otherInfo.internalNotes;
  if (updates.remarks !== undefined || notes.remarks !== undefined) updateData.remarks = updates.remarks || notes.remarks;
  if (updates.terms_conditions !== undefined || notes.termsAndConditions !== undefined) updateData.terms_conditions = updates.terms_conditions || notes.termsAndConditions;
  
  if (updates.gross_amount !== undefined || summary.grossAmount !== undefined) updateData.gross_amount = updates.gross_amount || summary.grossAmount || 0;
  if (updates.discount_amount !== undefined || summary.discountAmount !== undefined) updateData.discount_amount = updates.discount_amount || summary.discountAmount || 0;
  if (updates.tax_amount !== undefined || summary.taxAmount !== undefined) updateData.tax_amount = updates.tax_amount || summary.taxAmount || 0;
  if (updates.round_off_amount !== undefined || summary.roundOffAmount !== undefined) updateData.round_off_amount = updates.round_off_amount || summary.roundOffAmount || 0;
  if (updates.total_amount !== undefined || summary.totalAmount !== undefined) updateData.total_amount = updates.total_amount || summary.totalAmount || 0;
  if (updates.ref_invoice !== undefined || d.refInvoice !== undefined) updateData.ref_invoice = updates.ref_invoice || d.refInvoice;
  
  const itemsList = d.items || updates.items || [];
  if (itemsList.length > 0) {
    const firstItem = itemsList[0];
    updateData.item_code = firstItem.itemCode || '';
    updateData.item_description = firstItem.description || '';
    updateData.item_quantity = firstItem.quantity || 0;
    updateData.item_unit_price = firstItem.unitPrice || 0;
    updateData.item_discount_percent = firstItem.discountPercent || 0;
    updateData.item_tax_percent = firstItem.taxPercent || 0;
    updateData.item_net_amount = firstItem.netAmount || 0;
  }

  const { data: result, error } = await supabase
    .from('scales_return')
    .update(updateData)
    .eq('id', String(id))
    .select()
    .single();
    
  if (error) throw error;
  return { ...updates, id: result.id, SalesReturnNo: result.return_no };
};

export const deleteSalesReturn = async (id) => {
  const { error } = await supabase.from('scales_return').delete().eq('id', String(id));
  if (error) throw error;
  return true;
};
