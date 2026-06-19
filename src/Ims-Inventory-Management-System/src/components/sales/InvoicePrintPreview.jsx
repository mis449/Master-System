import React from 'react';
import logoImg from '../../../../assets/logo.png';
import useDataStore from '../../store/dataStore';

// Simple utility to convert numbers to words
const numberToWords = (num) => {
  const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += n[1] != 0 ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
  str += n[2] != 0 ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
  str += n[3] != 0 ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
  str += n[4] != 0 ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
  str += n[5] != 0 ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.trim().toUpperCase();
};

const convertAmountToWords = (amount) => {
  if (amount === 0) return 'ZERO RUPEES ONLY';
  const parts = Number(amount).toFixed(2).split('.');
  const integerPart = Number(parts[0]);
  const fractionalPart = Number(parts[1]);
  
  let words = numberToWords(integerPart) + ' RUPEES';
  if (fractionalPart > 0) {
    words += ' AND ' + numberToWords(fractionalPart) + ' PAISE';
  }
  return words + ' ONLY';
};

export default function InvoicePrintPreview({
  initialData,
  basicInfo,
  otherInfo,
  items,
  summary,
  orientation = 'Portrait',
  documentTitle = 'TAX INVOICE'
}) {
  const isLandscape = orientation === 'Horizontal';
  const quotationNo = initialData?.SalesReturnNo || initialData?.invoiceNo || initialData?.docNo || 'Draft';
  const createdOn = initialData?.date || initialData?.docDate || new Date().toISOString().split('T')[0];
  const paymentTerms = basicInfo?.paymentTerms || 'Net 30';

  const customers = useDataStore.getState().customers || [];
  const linkedCustomer = customers.find(c => 
    (c.name === basicInfo?.customer) || 
    (c.company === basicInfo?.customer) || 
    (c.firstName && basicInfo?.customer?.includes(c.firstName))
  );

  const customerName = basicInfo?.customer || linkedCustomer?.name || 'Walk-in Customer';
  const customerAddress = basicInfo?.address || linkedCustomer?.address || '-';
  const customerPinCode = basicInfo?.areaPinCode || linkedCustomer?.areaPinCode || '';
  const customerCityState = basicInfo?.cityState || linkedCustomer?.cityState || '';

  const getCustomerState = (cityStateString) => {
    if (!cityStateString) return '';
    if (cityStateString.includes('/')) {
      return cityStateString.split('/')[1].trim();
    }
    return cityStateString.trim();
  };

  const customerState = getCustomerState(customerCityState) || getCustomerState(linkedCustomer?.cityState) || 'CHHATTISGARH';
  const customerGstin = basicInfo?.gstin || linkedCustomer?.gstin || 'URP';
  const customerMobile = basicInfo?.mobile || linkedCustomer?.mobile || '-';

  const consigneeName = otherInfo?.shipTo || customerName;

  // Format date nicely
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  };

  const formattedDate = formatDate(createdOn);

  // Due Date
  const dueDateVal = basicInfo?.validityDate || initialData?.validity_date || initialData?.validityDate || '';
  const formattedDueDate = dueDateVal ? formatDate(dueDateVal) : formattedDate;

  // Transport details
  const transportationMode = otherInfo?.transportationMode || initialData?.details?.otherInfo?.transportationMode || '-';
  const vehicleNo = otherInfo?.vehicleNo || initialData?.details?.otherInfo?.vehicleNo || '-';
  
  const poDateVal = otherInfo?.poDate || initialData?.details?.otherInfo?.poDate || '';
  const formattedPoDate = poDateVal ? formatDate(poDateVal) : formattedDate;

  const dateOfSupplyVal = otherInfo?.dateOfSupply || initialData?.details?.otherInfo?.dateOfSupply || '';
  const formattedDateOfSupply = dateOfSupplyVal ? formatDate(dateOfSupplyVal) : formattedDate;

  const salesPerson = otherInfo?.salesPerson || linkedCustomer?.salesPerson || initialData?.salesPerson || 'Admin';
  const placeOfSupply = otherInfo?.placeOfSupply || initialData?.details?.otherInfo?.placeOfSupply || customerState || 'CHHATTISGARH';

  const ackNo = otherInfo?.ackNo || initialData?.details?.otherInfo?.ackNo || '-';
  const irnNo = otherInfo?.irnNo || initialData?.details?.otherInfo?.irnNo || '-';

  // Flatten items and compute calculations
  const inventoryItems = useDataStore.getState().items || [];
  const itemsFiltered = items?.filter(item => item.itemCode || item.description) || [];
  const flattenedRows = [];

  itemsFiltered.forEach((item) => {
    if (item.type !== 'section' && item.type !== 'subsection') {
      const unitPrice = Number(item.unitPrice || 0);
      const discountPercent = Number(item.discountPercent || 0);
      const netRate = unitPrice - (unitPrice * (discountPercent / 100));
      const grossAmount = unitPrice * (Number(item.quantity) || 0);
      const discountAmount = grossAmount * (discountPercent / 100);
      const taxableValue = grossAmount - discountAmount;

      const taxPercent = Number(item.taxPercent || 18);
      const cgstRate = taxPercent / 2;
      const sgstRate = taxPercent / 2;
      const cgstAmount = taxableValue * (cgstRate / 100);
      const sgstAmount = taxableValue * (sgstRate / 100);

      const matchedInventoryItem = inventoryItems.find(i => 
        (i.ItemCode || i.code || '').toString().trim().toLowerCase() === 
        (item.itemCode || '').toString().trim().toLowerCase()
      );
      const hsnCode = item.hsnCode || item.hsn || matchedInventoryItem?.HSNCode || '-';

      flattenedRows.push({
        ...item,
        type: 'product',
        grossAmount,
        discountAmount,
        taxableValue,
        cgstRate,
        cgstAmount,
        sgstRate,
        sgstAmount,
        netRate,
        hsnCode
      });
    }
  });

  // Calculate totals
  const totalQty = flattenedRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  const totalPackages = totalQty; // Default package count to total qty as per screenshot reference
  const totalGrossAmount = flattenedRows.reduce((sum, r) => sum + r.grossAmount, 0);
  const totalDiscountAmount = flattenedRows.reduce((sum, r) => sum + r.discountAmount, 0);
  const totalTaxableValue = flattenedRows.reduce((sum, r) => sum + r.taxableValue, 0);
  const totalCgstAmount = flattenedRows.reduce((sum, r) => sum + r.cgstAmount, 0);
  const totalSgstAmount = flattenedRows.reduce((sum, r) => sum + r.sgstAmount, 0);
  const grandTotal = totalTaxableValue + totalCgstAmount + totalSgstAmount;
  const roundedGrandTotal = Math.round(grandTotal);
  const roundOff = roundedGrandTotal - grandTotal;

  // Group tax by rates
  const taxGroupMap = {};
  flattenedRows.forEach(row => {
    const rate = row.cgstRate;
    if (!taxGroupMap[rate]) {
      taxGroupMap[rate] = {
        cgstRate: rate,
        sgstRate: row.sgstRate,
        cgstAmount: 0,
        sgstAmount: 0
      };
    }
    taxGroupMap[rate].cgstAmount += row.cgstAmount;
    taxGroupMap[rate].sgstAmount += row.sgstAmount;
  });

  const taxGroups = Object.values(taxGroupMap).sort((a, b) => b.cgstRate - a.cgstRate);

  // Pagination Logic
  const pages = [];
  let i = 0;
  let hasHeader = true;

  while (i < flattenedRows.length) {
    const capacityWithFooter = isLandscape
      ? (hasHeader ? 7 : 14)
      : (hasHeader ? 9 : 18);
    
    const capacityWithoutFooter = isLandscape
      ? (hasHeader ? 13 : 22)
      : (hasHeader ? 18 : 30);
    
    const remainingRowsCount = flattenedRows.length - i;
    
    let pageRows = [];
    let hasFooter = false;
    
    if (remainingRowsCount <= capacityWithFooter) {
      pageRows = flattenedRows.slice(i, i + remainingRowsCount);
      hasFooter = true;
      i += remainingRowsCount;
    } else {
      let packCount = capacityWithoutFooter;
      if (remainingRowsCount <= capacityWithoutFooter) {
        packCount = remainingRowsCount - 1;
      }
      pageRows = flattenedRows.slice(i, i + packCount);
      hasFooter = false;
      i += packCount;
    }
    
    pages.push({
      rows: pageRows,
      hasHeader,
      hasFooter
    });
    
    hasHeader = false;
  }

  if (pages.length === 0) {
    pages.push({
      rows: [],
      hasHeader: true,
      hasFooter: true
    });
  }

  return (
    <div className="w-full text-black font-sans bg-white" id="invoice-print-preview-container">
      <style>
        {`
          @media print {
            @page {
              size: A4 ${isLandscape ? 'landscape' : 'portrait'};
              margin: 0;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
            }
            .invoice-page {
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              page-break-after: always;
              break-after: page;
            }
          }
          .invoice-page {
            width: ${isLandscape ? '295mm' : '210mm'};
            height: ${isLandscape ? '210mm' : '295mm'};
            padding: 8mm 10mm;
            box-sizing: border-box;
            background: white;
            position: relative;
            font-size: 11px;
            line-height: 1.2;
          }
          .invoice-border {
            border: 1.5px solid black;
            height: 100%;
            width: 100%;
            display: flex;
            flex-direction: column;
            position: relative;
            box-sizing: border-box;
          }
          .invoice-page table th, .invoice-page table td {
            border: 0.5px solid black !important;
            padding: 5px 6px !important;
            font-size: 9px !important;
            vertical-align: middle !important;
            font-family: inherit;
          }
          .invoice-page table th {
            font-weight: bold !important;
            text-align: center !important;
            font-size: 8.5px !important;
            padding: 4px 2px !important;
          }
          .invoice-landscape {
            font-size: 7.5px !important;
            padding: 2mm 3mm !important;
          }
          .invoice-landscape .invoice-border {
            border: 1px solid black !important;
          }
          .invoice-landscape img {
            height: 30px !important;
          }
          .invoice-landscape table th, .invoice-landscape table td {
            padding: 1.5px 2px !important;
            font-size: 6.5px !important;
            line-height: 1.1 !important;
          }
          .invoice-landscape table th {
            font-size: 6.5px !important;
            padding: 1px 0.5px !important;
          }
          .invoice-landscape table tr.empty-row {
            height: 18px !important;
          }
          .invoice-landscape .p-2 {
            padding: 2px !important;
          }
          .invoice-landscape .p-1 {
            padding: 1.5px !important;
          }
          .invoice-landscape .py-1 {
            padding-top: 0.5px !important;
            padding-bottom: 0.5px !important;
          }
          .invoice-landscape .px-2 {
            padding-left: 3px !important;
            padding-right: 3px !important;
          }
          .invoice-landscape .gap-3 {
            gap: 3px !important;
          }
          .invoice-landscape .gap-2 {
            gap: 1.5px !important;
          }
          .invoice-landscape .gap-y-1 {
            row-gap: 1px !important;
          }
          .invoice-landscape .gap-y-0\.5 {
            row-gap: 0px !important;
          }
          .invoice-landscape .space-y-2 > * + * {
            margin-top: 1px !important;
          }
          .invoice-landscape .space-y-1 > * + * {
            margin-top: 0.5px !important;
          }
          .invoice-landscape .space-y-0\.5 > * + * {
            margin-top: 0px !important;
          }
          .invoice-landscape .mt-10 {
            margin-top: 4px !important;
          }
          .invoice-landscape .mt-auto {
            margin-top: auto !important;
          }
          
          /* Tailwind font-size utility overrides for landscape mode */
          .invoice-landscape .text-xl {
            font-size: 12px !important;
            line-height: 1.05 !important;
          }
          .invoice-landscape .text-lg {
            font-size: 10px !important;
          }
          .invoice-landscape .text-xs {
            font-size: 7.5px !important;
          }
          .invoice-landscape .text-sm {
            font-size: 8px !important;
          }
          .invoice-landscape .text-\[10px\] {
            font-size: 7px !important;
          }
          .invoice-landscape .text-\[9px\] {
            font-size: 6.5px !important;
          }
          .invoice-landscape .text-\[8px\] {
            font-size: 6px !important;
          }
          .invoice-landscape .mt-0\.5 {
            margin-top: 0px !important;
          }
          .invoice-landscape .mb-1 {
            margin-bottom: 1.5px !important;
          }
          .invoice-landscape .mt-1 {
            margin-top: 1.5px !important;
          }
          .invoice-landscape table tr {
            height: auto !important;
          }
          .invoice-landscape .col-span-6.space-y-0\.5 p {
            margin-bottom: 0px !important;
            line-height: 1.05 !important;
          }
        `}
      </style>

      {(() => {
        let currentStartIndex = 0;
        const pageStartIndices = pages.map((p) => {
          const start = currentStartIndex;
          currentStartIndex += p.rows.length;
          return start;
        });

        return pages.map((page, pageIdx) => (
          <div key={pageIdx} className={`invoice-page mx-auto shadow-md border border-slate-200 mb-8 print:mb-0 ${isLandscape ? 'invoice-landscape' : ''}`}>
          <div className="invoice-border flex flex-col w-full">
            <div className="w-full flex-1">
              {/* GSTIN & Document Title */}
              <div className="flex justify-between items-center px-2 py-1 border-b border-black">
                <span className="font-bold text-[10px]">GSTIN NO. : 22AAKFP3460D1ZL</span>
                <span className="font-black text-xs tracking-wider underline">{documentTitle.toUpperCase()}</span>
                <span className="w-24"></span>
              </div>

              {page.hasHeader && (
                <>
                  {/* Company Header */}
                  <div className="grid grid-cols-10 border-b border-black">
                    <div className="col-span-7 p-2 flex gap-3 items-center">
                      <img src={logoImg} alt="Parekh Logo" className="h-[60px] object-contain mix-blend-multiply" />
                      <div>
                        <h1 className="text-xl font-black text-[#851C1C] tracking-tight uppercase leading-none">Parekh Sanitary Stores</h1>
                        <p className="text-[9px] text-slate-500 mt-1 uppercase font-semibold">Luxury Bathroom Solutions &amp; Sanitary Ware</p>
                      </div>
                    </div>
                    <div className="col-span-3 border-l border-black p-2 space-y-1 text-[10px]">
                      {documentTitle !== 'SALES RETURN' && (
                        <>
                          <div className="flex justify-between"><span>Reverse Charge</span> <span>: No</span></div>
                          <div className="flex justify-between"><span>Invoice No.</span> <span className="font-bold">: {quotationNo}</span></div>
                        </>
                      )}
                      <div className="flex justify-between"><span>{documentTitle === 'SALES RETURN' ? 'Return Date' : 'Inv.Date'}</span> <span className="font-bold">: {formattedDate}</span></div>
                      <div className="flex justify-between"><span>Due Date</span> <span className="font-bold">: {formattedDueDate}</span></div>
                      <div className="flex justify-between"><span>State</span> <span>: CHHATTISGARH</span></div>
                      <div className="flex justify-between"><span>State Code</span> <span className="font-bold">: 22</span></div>
                    </div>
                  </div>

                  {/* Transportation details / Sales Return metadata */}
                  {documentTitle === 'SALES RETURN' ? (
                    <div className="grid grid-cols-10 border-b border-black text-[9px] p-0 font-medium">
                      {/* Left Column */}
                      <div className="col-span-5 p-2 space-y-1">
                        <div className="flex justify-between">
                          <span className="w-56 text-left">Against Invoice / Bill of Supply No.</span>
                          <span className="w-16 font-bold text-left">: {initialData?.invoiceNo || initialData?.docNo || otherInfo?.againstInvoiceNo || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="w-56 text-left">Date of Invoice / Bill of Supply</span>
                          <span className="w-16 font-bold text-left">: {initialData?.date || initialData?.docDate || otherInfo?.againstInvoiceDate ? formatDate(initialData?.date || initialData?.docDate || otherInfo?.againstInvoiceDate) : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="w-56 text-left">Issue Reason</span>
                          <span className="w-16 font-bold text-left">: {otherInfo?.issueReason || '07-Others'}</span>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="col-span-5 border-l border-black p-2 space-y-1">
                        <div className="grid grid-cols-12 gap-1">
                          <span className="col-span-4">Party Ref.No.</span>
                          <span className="col-span-4">: {otherInfo?.customerReference || otherInfo?.referenceNumber || '-'}</span>
                          <span className="col-span-4 text-right pr-2">Dt. : {otherInfo?.poDate ? formatDate(otherInfo.poDate) : formattedDate}</span>
                        </div>
                        <div className="grid grid-cols-12 gap-1">
                          <span className="col-span-4">Party Challan No.</span>
                          <span className="col-span-4">: {otherInfo?.challanNo || '-'}</span>
                          <span className="col-span-4 text-right pr-2">Dt. : {otherInfo?.challanDate ? formatDate(otherInfo.challanDate) : formattedDate}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-10 border-b border-black text-[9px] p-2 gap-y-1">
                      {documentTitle !== 'SALES RETURN' ? (
                        <div className="col-span-3"><span>Transportation Mode :</span> <span className="font-semibold">{transportationMode}</span></div>
                      ) : (
                        <div className="col-span-3"></div>
                      )}
                      <div className="col-span-3"><span>Party PO/Ref.No. :</span> <span className="font-semibold">{otherInfo?.customerReference || otherInfo?.referenceNumber || '-'}</span></div>
                      <div className="col-span-4"><span>Dt. :</span> <span className="font-semibold">{formattedPoDate}</span></div>
                      {documentTitle !== 'SALES RETURN' ? (
                        <div className="col-span-3"><span>Vehicle No. :</span> <span className="font-semibold uppercase">{vehicleNo}</span></div>
                      ) : (
                        <div className="col-span-3"></div>
                      )}
                      {documentTitle !== 'SALES RETURN' ? (
                        <>
                          <div className="col-span-3"><span>Ref.No. :</span> <span className="font-semibold">{quotationNo}</span></div>
                          <div className="col-span-4"><span>Dt. :</span> <span className="font-semibold">{formattedDate}</span></div>
                        </>
                      ) : (
                        <>
                          <div className="col-span-3"></div>
                          <div className="col-span-4"></div>
                        </>
                      )}
                      <div className="col-span-3"><span>Date of Supply :</span> <span className="font-semibold">{formattedDateOfSupply}</span></div>
                      <div className="col-span-3"><span>Sales Person :</span> <span className="font-semibold uppercase">{salesPerson}</span></div>
                      <div className="col-span-4 text-right pr-2"><span>MRP</span></div>
                      <div className="col-span-3"><span>Place of Supply :</span> <span className="font-semibold uppercase">{placeOfSupply}</span></div>
                      <div className="col-span-3"><span>Freight Terms :</span> <span>{paymentTerms}</span></div>
                      <div className="col-span-4"></div>
                    </div>
                  )}

                  {/* Bill-to Ship-to side-by-side details */}
                  <div className="grid grid-cols-2 border-b border-black">
                    <div className="p-2 border-r border-black flex flex-col justify-between">
                      <div className="text-[10px] font-bold text-[#851C1C] underline mb-1 uppercase tracking-wide">Detail of Receiver (Billed to)</div>
                      <div className="space-y-0.5 text-[10px]">
                        <div className="flex"><span className="w-16 font-bold">Name</span><span>: {customerName}</span></div>
                        <div className="flex"><span className="w-16 font-bold">Address</span><span className="uppercase">: {customerAddress}</span></div>
                        <div className="flex"><span className="w-16 font-bold"></span><span className="uppercase">{customerPinCode ? `${customerPinCode}, ` : ''}{customerCityState}</span></div>
                        <div className="flex"><span className="w-16 font-bold">GSTIN</span><span className="font-bold">: {customerGstin}</span></div>
                        <div className="flex"><span className="w-16 font-bold">State</span><span>: {customerState}</span></div>
                        <div className="flex"><span className="w-16 font-bold">Mobile</span><span>: {customerMobile}</span></div>
                      </div>
                    </div>
                    <div className="p-2 flex flex-col justify-between">
                      <div className="text-[10px] font-bold text-[#851C1C] underline mb-1 uppercase tracking-wide">Detail of Consignee (Shipped to)</div>
                      <div className="space-y-0.5 text-[10px]">
                        <div className="flex"><span className="w-16 font-bold">Name</span><span>: {consigneeName}</span></div>
                        <div className="flex"><span className="w-16 font-bold">Address</span><span className="uppercase">: {customerAddress}</span></div>
                        <div className="flex"><span className="w-16 font-bold"></span><span className="uppercase">{customerPinCode ? `${customerPinCode}, ` : ''}{customerCityState}</span></div>
                        <div className="flex"><span className="w-16 font-bold">GSTIN</span><span className="font-bold">: {customerGstin}</span></div>
                        <div className="flex"><span className="w-16 font-bold">State</span><span>: {customerState}</span></div>
                        <div className="flex"><span className="w-16 font-bold">Mobile</span><span>: {customerMobile}</span></div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Items Table */}
              <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '3%' }} />
                  <col style={{ width: '27%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '3%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '3%' }} />
                  <col style={{ width: '7%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 border-b border-black text-[9px] uppercase font-bold text-center">
                    <th rowSpan="2">Sr.<br/>No.</th>
                    <th rowSpan="2" className="text-left pl-2">Description of Product / Service</th>
                    <th rowSpan="2">HSN /<br/>SAC</th>
                    <th rowSpan="2">No. &amp; Desc<br/>of<br/>Packages</th>
                    <th rowSpan="2">Qty &amp;<br/>UQC</th>
                    <th rowSpan="2">Rate</th>
                    <th rowSpan="2">Gross<br/>Amount</th>
                    <th rowSpan="2">Less<br/>Disc</th>
                    <th rowSpan="2">Total<br/>Value</th>
                    <th colSpan="2">CGST</th>
                    <th colSpan="2">SGST</th>
                  </tr>
                  <tr className="bg-slate-50 border-b border-black text-[8px] uppercase font-bold text-center">
                    <th>%</th>
                    <th>Amt</th>
                    <th>%</th>
                    <th>Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {page.rows.map((row, idx) => {
                    const globalIdx = pageStartIndices[pageIdx] + idx + 1;
                    return (
                      <tr key={idx} className="border-b border-black/10 text-[9px] min-h-[45px] hover:bg-slate-50/50">
                        <td className="text-center">{globalIdx}</td>
                        <td className="text-left leading-tight font-medium">
                          <span className="font-bold text-[10px] block">{row.itemCode}</span>
                          <span className="text-slate-600 block mt-0.5">{row.description}</span>
                        </td>
                        <td className="text-center">{row.hsnCode || '-'}</td>
                        <td className="text-center">{row.quantity}</td>
                        <td className="text-center font-semibold">{row.quantity} PCS</td>
                        <td className="text-right whitespace-nowrap">{Number(row.unitPrice).toFixed(2)}</td>
                        <td className="text-right whitespace-nowrap">{Number(row.grossAmount).toFixed(2)}</td>
                        <td className="text-center">{row.discountPercent > 0 ? `${row.discountPercent}%` : '-'}</td>
                        <td className="text-right font-semibold whitespace-nowrap">{Number(row.taxableValue).toFixed(2)}</td>
                        <td className="text-center">{row.cgstRate}%</td>
                        <td className="text-right whitespace-nowrap">{Number(row.cgstAmount).toFixed(2)}</td>
                        <td className="text-center">{row.sgstRate}%</td>
                        <td className="text-right whitespace-nowrap">{Number(row.sgstAmount).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  
                  {/* Fill empty space if fewer rows */}
                  {(() => {
                    const capacity = page.hasFooter 
                      ? (page.hasHeader ? (isLandscape ? 7 : 9) : (isLandscape ? 14 : 18)) 
                      : (page.hasHeader ? (isLandscape ? 13 : 18) : (isLandscape ? 22 : 30));
                    const emptyRowsCount = Math.max(0, capacity - page.rows.length - (page.hasFooter ? 1 : 0));
                    if (emptyRowsCount <= 0) return null;
                    return [...Array(emptyRowsCount)].map((_, emptyIdx) => (
                      <tr key={`empty-${emptyIdx}`} className={`${isLandscape ? 'h-[18px]' : 'h-[40px]'} border-b border-black/5 empty-row`}>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                      </tr>
                    ));
                  })()}

                  {/* Render Total row inside table for perfect column alignment */}
                  {page.hasFooter && (
                    <tr className="border-t-2 border-b border-black font-bold text-[9px] uppercase bg-slate-50">
                      <td colSpan="2" className="text-center font-bold">Total :</td>
                      <td className="text-center"></td>
                      <td className="text-center">{totalPackages}</td>
                      <td className="text-center font-semibold">{totalQty} PCS</td>
                      <td className="text-right"></td>
                      <td className="text-right whitespace-nowrap">{totalGrossAmount.toFixed(2)}</td>
                      <td className="text-center"></td>
                      <td className="text-right font-semibold whitespace-nowrap">{totalTaxableValue.toFixed(2)}</td>
                      <td className="text-center"></td>
                      <td className="text-right whitespace-nowrap">{totalCgstAmount.toFixed(2)}</td>
                      <td className="text-center"></td>
                      <td className="text-right whitespace-nowrap">{totalSgstAmount.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {page.hasFooter && (
              <div className="border-t border-black bg-white">

                {/* Main totals, GST in words and bank details */}
                <div className="grid grid-cols-10 text-[9px]">
                  {/* Left Column (GST Amt, Taxable value, bank, ack, conditions) */}
                  <div className={`col-span-6 border-r border-black ${isLandscape ? 'p-1 space-y-1' : 'p-2 space-y-2'}`}>
                    <div>
                      <span className="font-bold">GST Amt :</span> <span className="font-bold text-slate-700">{convertAmountToWords(totalCgstAmount + totalSgstAmount)}</span>
                    </div>
                    <div>
                      <span className="font-bold">Total Taxable :</span> <span className="font-bold text-slate-800">₹ {totalTaxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-[8px] leading-tight">
                      <span className="font-bold text-[#851C1C]">GST Payable on Reverse Charge: No</span>
                    </div>
                    <div>
                      <span className="font-bold block underline mb-0.5">Bank Details :</span>
                      <div className="grid grid-cols-12 text-[8px] gap-y-0.5 font-medium">
                        <span className="col-span-4 font-semibold">Name</span><span className="col-span-8">: PAREKH SANITARY STORES</span>
                        <span className="col-span-4 font-semibold">Bank Name</span><span className="col-span-8">: INDUSIND BANK LTD.</span>
                        <span className="col-span-4 font-semibold">Bank Address</span><span className="col-span-8">: MG ROAD, RAIPUR</span>
                        <span className="col-span-4 font-semibold">Account No</span><span className="col-span-8 font-bold">: 6500141113803</span>
                        <span className="col-span-4 font-semibold">IFSC Code</span><span className="col-span-8 font-bold">: INDB0000841</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-t border-black/10 pt-2 text-[8px]">
                      <div><span className="font-semibold block">Ack.No. : <span className="font-bold">{ackNo}</span></span></div>
                      <div><span className="font-semibold block">IRN No. : <span className="font-bold">{irnNo}</span></span></div>
                    </div>
                  </div>

                  {/* Right Column (Gross Amount, Tax details, Grand Total) */}
                  <div className="col-span-4 flex flex-col justify-between">
                    <div className="divide-y divide-black/10 text-[9px] p-2 space-y-1">
                      <div className="flex justify-between font-medium"><span>Total Gross Amount :</span> <span className="font-bold">₹ {totalTaxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                      {taxGroups.map((group, gIdx) => (
                        <React.Fragment key={gIdx}>
                          <div className="flex justify-between font-medium pt-1" key={`cgst-${gIdx}`}>
                            <span>CGST @ {group.cgstRate}% :</span>
                            <span className="font-bold">₹ {group.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between font-medium pt-1" key={`sgst-${gIdx}`}>
                            <span>SGST @ {group.sgstRate}% :</span>
                            <span className="font-bold">₹ {group.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </React.Fragment>
                      ))}
                      <div className="flex justify-between font-medium pt-1"><span>Round Off :</span> <span className="font-bold">₹ {roundOff.toFixed(2)}</span></div>
                    </div>
                    <div className="bg-slate-50 border-t border-b border-black p-2 flex justify-between items-center text-xs font-black uppercase tracking-wider">
                      <span>Total Amount :</span>
                      <span className="text-[#851C1C] underline">₹ {roundedGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="p-2 text-center text-[9px] font-bold">
                      {convertAmountToWords(roundedGrandTotal)}
                    </div>
                  </div>
                </div>

                {/* Terms and Conditions + Signature footer */}
                <div className={`grid grid-cols-10 border-t border-black text-[8px] gap-2 ${isLandscape ? 'p-1' : 'p-2'}`}>
                  <div className="col-span-6 space-y-0.5 leading-tight">
                    <span className="font-bold block underline">Terms &amp; Conditions :</span>
                    <p>1. All disputes are subject to Exclusive Jurisdiction of Courts in Raipur only.</p>
                    <p>2. Ownership transferred to you when the goods were handed over to the courier/transporter.</p>
                    <p>3. The company is not responsible for any damage or short material once the material is delivered, so Kindly check the material thoroughly before taking the delivery.</p>
                    <p>4. Any changes to the customer details in the invoice can be considered before the delivery of the products. No alterations can be done to the invoice after the material has been delivered.</p>
                  </div>
                  <div className="col-span-4 flex flex-col justify-between items-end text-right">
                    <span className="font-bold text-[9px]">For, Parekh Sanitary Stores</span>
                    <span className="mt-10 font-bold border-t border-black/30 pt-1 w-48 block text-center">Authorised Signatory</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        ))
      })()}
    </div>
  );
}
