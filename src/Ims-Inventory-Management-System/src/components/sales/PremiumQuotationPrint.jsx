import React from 'react';
import { Mail, Instagram, MapPin } from 'lucide-react';
import logoImg from '../../../../assets/logo.png';
import firstImg from '../../Assets/first.png';
import secondImg from '../../Assets/second.png';
import thirdImg from '../../../../assets/third.png';
import pgLogo from '../../Assets/pglogo.png';
import upiImg from '../../../../assets/upi.png';
import locationQrImg from '../../../../assets/locationqr1.png';
import useDataStore from '../../store/dataStore';

export default function PremiumQuotationPrint({ 
  initialData, 
  basicInfo, 
  otherInfo, 
  items, 
  summary, 
  notes, 
  inventoryItems,
  documentTitle = "Quotation"
}) {
  const coverImage = firstImg;
  const verticalImage = secondImg;
  const qrCode = locationQrImg;

  const quotationNo = initialData?.quotationNo || initialData?.docNo || 'Draft';
  const createdOn = initialData?.date || initialData?.docDate || new Date().toISOString().split('T')[0];
  const staticSalesperson = otherInfo?.salesPerson || initialData?.salesPerson || 'Admin';

  // Robust customer lookup
  const customers = useDataStore.getState().customers || [];
  const linkedCustomer = customers.find(c => 
    (c.name === basicInfo?.customer) || 
    (c.company === basicInfo?.customer) || 
    (c.firstName && basicInfo?.customer?.includes(c.firstName))
  );

  const dynamicSalesperson = linkedCustomer?.salesPerson || staticSalesperson;
  const dynamicSalesNumber = linkedCustomer?.salesNo || otherInfo?.salesNumber || '-';
  const dynamicQuortperson = linkedCustomer?.quortPerson || otherInfo?.quortPerson || '-';
  const dynamicQuortMobile = linkedCustomer?.quortMobileNumber || otherInfo?.quortMobile || '-';

  // Format date nicely
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formattedDate = formatDate(createdOn);

  // Reusable Logo Component
  const Logo = () => (
    <div className="mb-6">
      <img src={logoImg} alt="Parekh Sanitary Stores Logo" className="h-[65px] object-contain origin-left mix-blend-multiply" />
    </div>
  );

  // Page wrapper — strict height to A4 size to prevent any extra blank pages
  const PageWrapper = ({ children, isLast = false, className = '' }) => (
    <div
      className={`w-full bg-white relative overflow-hidden ${isLast ? '' : 'break-after-page mb-8 print:mb-0'} ${className}`}
      style={{ padding: '8mm 10mm 12mm 10mm', boxSizing: 'border-box', height: '295mm' }}
    >
      <div className="w-full h-full pb-6">
        {children}
      </div>
      
      {/* Universal Footer */}
      <div className="absolute bottom-0 left-[10mm] right-[10mm] pt-2 border-t border-black text-center text-[12px] font-medium text-black bg-white z-10 pb-2">
        7880011158 | info@parekhgallerium.com | IG - @parekh_gallerium
      </div>
    </div>
  );

  return (
    <div className="w-full text-slate-800 font-sans print:!bg-transparent" id="premium-quotation-print" style={{ backgroundColor: '#f8fafc' }}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          #premium-quotation-print, #premium-quotation-print * {
            font-family: 'Inter', -apple-system, sans-serif !important;
          }
          @media print {
            @page {
              size: A4;
              margin: 0;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              height: 100% !important;
            }
            #premium-quotation-print {
              margin: 0 !important;
              padding: 0 !important;
            }
          }
        `}
      </style>

      
      {/* ── PAGE 1: Cover + Client Info (merged) ── */}
      <PageWrapper>
        {/* Header: Logo + Doc details */}
        <div className="flex flex-col" style={{ height: '265mm' }}>
          {/* Header: Logo + Doc details */}
          <div className="flex justify-between items-center mb-2 shrink-0">
            <div>
              <img src={logoImg} alt="Parekh Sanitary Stores Logo" className="h-[65px] object-contain origin-left mix-blend-multiply" />
            </div>
            <div className="text-sm space-y-1 text-slate-600 text-right">
              <div><span className="font-medium mr-2">Document # :</span> {quotationNo}</div>
              <div><span className="font-medium mr-2">Created On :</span> {formattedDate}</div>
            </div>
          </div>

          {/* Upper image — approx 45% height */}
          <div className="flex-1 min-h-0 mb-3 overflow-hidden">
            <img src={coverImage} alt="Luxury Bathroom Cover" className="w-full h-full object-cover object-center" />
          </div>

          {/* Document Title */}
          <div className="mb-3 shrink-0">
            <h1 className="text-2xl font-light tracking-wider text-slate-800">{documentTitle}</h1>
          </div>

          {/* Two-column: vertical image left, client info right — approx 45% height */}
          <div className="flex-1 min-h-0 flex gap-2 items-stretch">
            <div className="w-[40%] overflow-hidden">
              <img src={verticalImage} alt="Bathroom details" className="w-full h-full object-cover object-center" style={{ display: 'block' }} />
            </div>
            <div className="w-[60%] flex flex-col overflow-hidden">
              <table className="-mt-1 text-[14px] text-slate-800 mb-4 border-collapse" style={{ borderSpacing: 0 }}>
                <tbody>
                  <tr>
                    <td className="font-semibold pr-3 pb-0.5 whitespace-nowrap align-top">Client Name</td>
                    <td className="pr-2 pb-0.5 align-top">:</td>
                    <td className="pb-0.5 uppercase align-top font-medium">{basicInfo?.customer || 'Walk-in Customer'}</td>
                  </tr>
                  {basicInfo?.areaPinCode && (
                    <tr>
                      <td className="py-0.5"></td>
                      <td className="py-0.5"></td>
                      <td className="py-0.5 text-slate-600 leading-tight">{basicInfo.areaPinCode}</td>
                    </tr>
                  )}
                  {basicInfo?.address && (
                    <tr>
                      <td className="py-0.5"></td>
                      <td className="py-0.5"></td>
                      <td className="py-0.5 uppercase text-slate-600 leading-tight">{basicInfo.address}</td>
                    </tr>
                  )}
                  {basicInfo?.cityState && (
                    <tr>
                      <td className="py-0.5"></td>
                      <td className="py-0.5"></td>
                      <td className="py-0.5 uppercase text-slate-600 leading-tight">{basicInfo.cityState}, India</td>
                    </tr>
                  )}
                  <tr>
                    <td className="font-semibold pr-3 py-0.5 whitespace-nowrap">Client Number</td>
                    <td className="pr-2 py-0.5">:</td>
                    <td className="py-0.5">{basicInfo?.mobile || '-'}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold pr-3 py-0.5 whitespace-nowrap">Client Location</td>
                    <td className="pr-2 py-0.5">:</td>
                    <td className="py-0.5 uppercase">{basicInfo?.cityState?.split('/')[0] || '-'}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold pr-3 py-0.5 whitespace-nowrap">Salesperson</td>
                    <td className="pr-2 py-0.5">:</td>
                    <td className="py-0.5 uppercase">{dynamicSalesperson}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold pr-3 py-0.5 whitespace-nowrap">Sales Number</td>
                    <td className="pr-2 py-0.5">:</td>
                    <td className="py-0.5">{dynamicSalesNumber}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold pr-3 py-0.5 whitespace-nowrap">Quotation Person</td>
                    <td className="pr-2 py-0.5">:</td>
                    <td className="py-0.5 uppercase">{dynamicQuortperson}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold pr-3 py-0.5 whitespace-nowrap">Quort Mobile</td>
                    <td className="pr-2 py-0.5">:</td>
                    <td className="py-0.5">{dynamicQuortMobile}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold pr-3 py-0.5 whitespace-nowrap align-top pt-2">Scan to reach us</td>
                    <td className="pr-2 py-0.5 align-top pt-2">:</td>
                    <td className="py-0.5 align-top pt-1">
                      <img src={qrCode} alt="Scan to reach us" className="w-[85px] h-[85px] object-contain" />
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-auto space-y-1">
                <div className="flex items-center gap-3 text-[13px] text-slate-700">
                  <div className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-500 rounded"><Mail size={14} /></div>
                  <span>info@parekhgallerium.com</span>
                </div>
                <div className="flex items-center gap-3 text-[13px] text-slate-700">
                  <div className="w-6 h-6 flex items-center justify-center bg-pink-100 text-pink-500 rounded"><Instagram size={14} /></div>
                  <span>parekh_gallerium</span>
                </div>
                <div className="flex items-start gap-3 text-[13px] text-slate-700">
                  <div className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-500 rounded shrink-0"><MapPin size={14} /></div>
                  <span className="leading-tight">6M84+9HF, New Dhamtari Rd, RishabhNagar<br/>and Pawan Vihar Colony, Pachpedi Naka,<br/>Raipur, Tikrapara, Chhattisgarh 492001</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageWrapper>


      {/* ── PAGE 3 onwards: Product Details ── */}
      {(() => {
            const itemsFiltered = items?.filter(item => item.itemCode || item.description) || [];
            
            const flattenedRows = [];
            let currentSubtotal = { qty: 0, amt: 0 };
            let hasItemsSinceLastSubtotal = false;
            let currentSectionName = '';

            const pushSubtotal = () => {
              if (hasItemsSinceLastSubtotal) {
                flattenedRows.push({
                  type: 'subtotal',
                  isSubtotal: true,
                  qty: currentSubtotal.qty,
                  amount: currentSubtotal.amt
                });
                currentSubtotal = { qty: 0, amt: 0 };
                hasItemsSinceLastSubtotal = false;
              }
            };

            itemsFiltered.forEach((item) => {
              if (item.type === 'section') {
                pushSubtotal();
                currentSectionName = item.description || '';
                if (currentSectionName) {
                  flattenedRows.push({
                    type: 'section_header',
                    name: currentSectionName,
                    isContinuation: false
                  });
                }
              } else if (item.type === 'subsection') {
                flattenedRows.push({
                  type: 'subsection',
                  isSubsection: true,
                  description: item.description
                });
              } else {
                const unitPrice = Number(item.unitPrice || 0);
                const discountPercent = Number(item.discountPercent || 0);
                const addDiscountPercent = Number(item.addDiscount || 0);
                const qty = Number(item.quantity || 0);
                
                const rowGross = qty * unitPrice;
                const rowDiscount = rowGross * (discountPercent / 100);
                const afterFirstDiscount = rowGross - rowDiscount;
                const addDiscountAmt = afterFirstDiscount * (addDiscountPercent / 100);
                const afterDiscount = afterFirstDiscount - addDiscountAmt;
                
                const netRate = qty > 0 ? afterDiscount / qty : 0;
                const amount = afterDiscount;

                const matchedInventoryItem = inventoryItems?.find(i => (i.ItemCode || i.code) === item.itemCode);
                const imageUrl = item.thumbnail || item.image || (matchedInventoryItem ? (matchedInventoryItem.Thumbnail || matchedInventoryItem.product_image_url) : '');

                currentSubtotal.qty += qty;
                currentSubtotal.amt += amount;
                hasItemsSinceLastSubtotal = true;

                flattenedRows.push({ 
                  ...item, 
                  type: 'product',
                  amount, netRate, unitPrice, discountPercent, addDiscount: addDiscountPercent, imageUrl
                });
              }
            });

            pushSubtotal();

            const pages = [];
            let currentPageRows = [];
            let currentWeight = 0;
            let activeSectionName = '';

            for (let i = 0; i < flattenedRows.length; i++) {
              // The first page has the "PRODUCT DETAILS" header which takes extra space.
              // So limit first page to a safer weight of 7.4, and subsequent pages to 7.8.
              const MAX_WEIGHT = pages.length === 0 ? 7.4 : 7.8;

              const row = flattenedRows[i];
              let weight = 1.0;
              if (row.type === 'section_header') weight = 0.4;
              else if (row.type === 'subsection') weight = 0.3;
              else if (row.type === 'subtotal') weight = 0.4;
              else weight = 1.0; 

              const isNewSection = row.type === 'section_header';
              const currentProductCount = currentPageRows.filter(r => r.type === 'product').length;
              const shouldSplit = (row.type === 'product' && currentProductCount >= 7) || (currentWeight + weight > MAX_WEIGHT);

              if (isNewSection && currentPageRows.length > 0) {
                pages.push(currentPageRows);
                currentPageRows = [];
                currentWeight = 0;
              } else if (shouldSplit && currentPageRows.filter(r => r.type === 'product').length > 0) {
                // Prevent orphan headers at bottom
                let poppedHeaders = [];
                while (
                  currentPageRows.length > 0 && 
                  (currentPageRows[currentPageRows.length - 1].type === 'section_header' || currentPageRows[currentPageRows.length - 1].type === 'subsection')
                ) {
                  const h = currentPageRows.pop();
                  currentWeight -= (h.type === 'section_header' ? 0.4 : 0.3);
                  poppedHeaders.unshift(h);
                }

                if (currentPageRows.length > 0) {
                  pages.push(currentPageRows);
                }
                
                currentPageRows = [...poppedHeaders];
                currentWeight = poppedHeaders.reduce((sum, h) => sum + (h.type === 'section_header' ? 0.4 : 0.3), 0);

                if (activeSectionName && row.type !== 'section_header') {
                  if (poppedHeaders.length === 0 || poppedHeaders[0].type !== 'section_header') {
                    currentPageRows.unshift({
                      type: 'section_header',
                      name: activeSectionName,
                      isContinuation: true
                    });
                    currentWeight += 0.4;
                  }
                }
              }

              if (row.type === 'section_header') {
                activeSectionName = row.name;
              }

              currentPageRows.push(row);
              currentWeight += weight;
            }

            if (currentPageRows.length > 0) {
              pages.push(currentPageRows);
            }

            return pages.map((pageChunk, pageIdx) => {
              // Check if the very first row is a section_header so we can render it above the table column headers, to preserve exact UI
              const firstRowIsSection = pageChunk.length > 0 && pageChunk[0].type === 'section_header';
              const firstSectionRow = firstRowIsSection ? pageChunk[0] : null;
              const remainingRows = firstRowIsSection ? pageChunk.slice(1) : pageChunk;

              return (
                <PageWrapper key={`page-${pageIdx}`}>
                  <Logo />
                  {pageIdx === 0 && (
                    <h2 className="text-3xl font-bold text-slate-800 mb-6 uppercase tracking-wider">Product Details</h2>
                  )}
                  
                  <div className="space-y-6">
                    <table className="w-full text-left text-sm border-collapse mb-2" style={{ pageBreakInside: 'auto', tableLayout: 'fixed' }}>
                      <thead className="table-header-group">
                        {firstSectionRow && (
                          <tr>
                            <th colSpan="8" className="pt-4 pb-1.5 px-2 bg-white text-left font-normal text-black text-[20px] uppercase tracking-widest border-b border-black">
                              {firstSectionRow.name} {firstSectionRow.isContinuation ? '(Contd.)' : ''}
                            </th>
                          </tr>
                        )}
                        <tr className="bg-white text-slate-800 font-medium border-y border-black text-[11px] tracking-wider uppercase">
                          <th className="py-1 px-2 text-center w-[12%]">Image</th>
                          <th className="py-1 px-2 text-left w-[28%]">Product Details</th>
                          <th className="py-1 px-1 text-center w-[7%]">Qty</th>
                          <th className="py-1 px-1 text-right w-[13%]">MRP</th>
                          <th className="py-1 px-1 text-right w-[9%] whitespace-nowrap">Dis %</th>
                          <th className="py-1 px-1 text-right w-[9%] whitespace-nowrap">Add Dis %</th>
                          <th className="py-1 px-1 text-right w-[10%]">Net Rate</th>
                          <th className="py-1 px-2 text-right w-[12%]">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {remainingRows.map((item, idx) => {
                          if (item.type === 'section_header') {
                            return (
                              <tr key={`sec-${idx}`} className="break-inside-avoid">
                                <td colSpan="8" className="pt-4 pb-1.5 px-2 bg-white text-left font-normal text-black text-[20px] uppercase tracking-widest border-b border-black">
                                  {item.name} {item.isContinuation ? '(Contd.)' : ''}
                                </td>
                              </tr>
                            );
                          }

                          if (item.type === 'subtotal') {
                            return (
                              <tr key={`subtotal-${idx}`} className="border-y-2 border-black break-inside-avoid">
                                <td colSpan="2" className="py-2 px-2 text-center font-bold text-slate-800 text-xs uppercase tracking-widest">Total</td>
                                <td className="py-2 px-2 text-center font-bold text-slate-800 text-xs">{item.qty}</td>
                                <td colSpan="4"></td>
                                <td className="py-2 px-2 text-right font-bold text-slate-900 text-xs">₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            );
                          }

                          if (item.type === 'subsection') {
                            return (
                              <tr key={`sub-${idx}`} className="break-inside-avoid">
                                <td colSpan="8" className="py-1 px-2 text-center bg-gray-100 font-bold text-black text-[11px] uppercase tracking-wider border-y border-gray-300">
                                  {item.description}
                                </td>
                              </tr>
                            );
                          }

                          // Product row
                          const matchedInventoryItem = inventoryItems?.find(i => (i.ItemCode || i.code) === item.itemCode);

                          return (
                            <tr key={`prod-${idx}`} className="border-b border-slate-100 break-inside-avoid">
                              <td className="py-1.5 px-2 text-center align-middle">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt="product" className="h-[100px] w-auto max-w-full object-contain mx-auto" />
                                ) : (
                                  <div className="h-[100px] w-full max-w-[180px] flex items-center justify-center text-slate-300 mx-auto">
                                    <span className="text-[11px]">No Img</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-1.5 px-2 text-left align-top">
                                <div className="font-bold text-slate-900 text-[11px]">{item.itemCode || '-'}</div>
                                {item.description && (
                                  <div className="text-slate-600 text-[9px] mt-0.5 pr-2 leading-tight">
                                    {(() => {
                                      const desc = item.description;
                                      const code = item.itemCode;
                                      if (!desc) return '';
                                      if (!code) return desc;
                                      const escapedCode = code.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                                      const regexPatterns = [
                                        new RegExp(`\\s*-\\s*\\(\\s*${escapedCode}\\s*\\)`, 'i'),
                                        new RegExp(`\\s*\\(\\s*${escapedCode}\\s*\\)`, 'i'),
                                        new RegExp(`\\s*-\\s*${escapedCode}`, 'i')
                                      ];
                                      let cleaned = desc;
                                      for (const pattern of regexPatterns) {
                                        cleaned = cleaned.replace(pattern, '');
                                      }
                                      return cleaned.trim();
                                    })()}
                                  </div>
                                )}
                              </td>
                              <td className="py-1.5 px-1 text-center align-top">
                                <div className="text-slate-800 text-[11px]">{item.quantity}</div>
                                <div className="text-slate-600 text-[9px] mt-0.5 uppercase">PCS</div>
                              </td>
                              <td className="py-1.5 px-1 text-right align-top text-slate-800 text-[11px] whitespace-nowrap">₹ {item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td className="py-1.5 px-1 text-right align-top text-slate-800 text-[11px] whitespace-nowrap">{item.discountPercent > 0 ? `${Number(item.discountPercent).toFixed(3)}%` : '-'}</td>
                              <td className="py-1.5 px-1 text-right align-top text-slate-800 text-[11px] whitespace-nowrap">{item.addDiscount > 0 ? `${Number(item.addDiscount).toFixed(3)}%` : '-'}</td>
                              <td className="py-1.5 px-1 text-right align-top text-slate-800 text-[11px] whitespace-nowrap">{item.netRate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                              <td className="py-1.5 px-2 text-right align-top text-slate-900 text-[11px] whitespace-nowrap">₹ {item.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </PageWrapper>
              );
            });
          })()}

      {/* ── PAGE 4: Summary ── */}
      <PageWrapper>
        <Logo />
        <h2 className="text-3xl font-medium text-black mb-8 uppercase tracking-wider">Summary</h2>
        
        {(() => {
          const itemsFiltered = items?.filter(item => item.itemCode || item.description) || [];
          const sections = [];
          let curSection = { name: '', items: [] };

          itemsFiltered.forEach((item) => {
            if (item.type === 'section') {
              if (curSection.items.length > 0 || curSection.name !== '') sections.push(curSection);
              curSection = { name: item.description, items: [] };
            } else if (item.type !== 'subsection') {
              const unitPrice = Number(item.unitPrice || 0);
              const discountPercent = Number(item.discountPercent || 0);
              const addDiscountPercent = Number(item.addDiscount || 0);
              const qty = Number(item.quantity || 0);
              const mrp = unitPrice * qty;
              const firstDisc = mrp * (discountPercent / 100);
              const afterFirst = mrp - firstDisc;
              const secondDisc = afterFirst * (addDiscountPercent / 100);
              const disc = firstDisc + secondDisc;
              curSection.items.push({ mrp, disc, amount: mrp - disc });
            }
          });
          if (curSection.items.length > 0 || curSection.name !== '') sections.push(curSection);

          const sectionSummaryData = sections.filter(s => s.name).map(s => ({
            name: s.name,
            totalMRP: s.items.reduce((sum, i) => sum + i.mrp, 0),
            totalDiscount: s.items.reduce((sum, i) => sum + i.disc, 0),
            totalAmount: s.items.reduce((sum, i) => sum + i.amount, 0),
          }));

          const allMRP = sectionSummaryData.reduce((s, r) => s + r.totalMRP, 0);
          const allDiscount = sectionSummaryData.reduce((s, r) => s + r.totalDiscount, 0);
          const allAmount = sectionSummaryData.reduce((s, r) => s + r.totalAmount, 0);

          if (sectionSummaryData.length === 0) {
            return (
              <div className="flex justify-end mt-4">
                <div className="w-80 space-y-3 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Amount:</span>
                    <span>₹{Number(summary?.grossAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Discount:</span>
                    <span>- ₹{Number(summary?.discountAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax Amount:</span>
                    <span>+ ₹{Number(summary?.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold text-lg border-t border-slate-300 pt-3 mt-2">
                    <span>Grand Total:</span>
                    <span>₹{Number(summary?.totalAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  {summary?.finalAmount && (
                    <div className="flex justify-between text-emerald-700 font-black text-xl border-t border-slate-300 pt-3 mt-2">
                      <span>Final Amount:</span>
                      <span>₹{Number(summary?.finalAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <table className="w-full text-left text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="border-t border-black text-[12px] font-bold text-black uppercase tracking-wider">
                  <th className="py-3 px-4 text-left w-[40%]">Section</th>
                  <th className="py-3 px-4 text-right w-[20%]">Total MRP</th>
                  <th className="py-3 px-4 text-right w-[20%]">Discount</th>
                  <th className="py-3 px-4 text-right w-[20%]">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sectionSummaryData.map((sec, i) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="py-3 px-4 text-left text-[13px] text-black uppercase">{sec.name}</td>
                    <td className="py-3 px-4 text-right text-[13px] text-black">₹ {sec.totalMRP.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</td>
                    <td className="py-3 px-4 text-right text-[13px] text-black">₹ {sec.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</td>
                    <td className="py-3 px-4 text-right text-[13px] text-black">₹ {sec.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</td>
                  </tr>
                ))}
                {/* Total for all sections */}
                <tr className="border-t-2 border-black">
                  <td className="py-3 px-4 text-left text-[13px] font-black text-black uppercase tracking-wide">Total for all Sections</td>
                  <td className="py-3 px-4 text-right text-[13px] font-bold text-black">₹ {allMRP.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</td>
                  <td className="py-3 px-4 text-right text-[13px] font-bold text-black">₹ {allDiscount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</td>
                  <td className="py-3 px-4 text-right text-[13px] font-bold text-black">₹ {allAmount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</td>
                </tr>
                {/* Tax/GST */}
                <tr>
                  <td className="py-3 px-4 text-left text-[13px] text-slate-700">Tax Amount (GST)</td>
                  <td colSpan="2"></td>
                  <td className="py-3 px-4 text-right text-[13px] text-slate-700">₹ {Number(summary?.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                {/* Grand Total */}
                <tr className="border-t-2 border-black">
                  <td className="py-4 px-4 text-left text-[15px] font-black text-black uppercase tracking-wide">Grand Total</td>
                  <td colSpan="2"></td>
                  <td className="py-4 px-4 text-right text-[15px] font-black text-black">₹ {Number(summary?.totalAmount || 0).toLocaleString('en-IN')}</td>
                </tr>
                {summary?.finalAmount && (
                  <tr className="border-t border-black">
                    <td className="py-4 px-4 text-left text-[15px] font-black text-emerald-800 uppercase tracking-wide">Final Amount</td>
                    <td colSpan="2"></td>
                    <td className="py-4 px-4 text-right text-[15px] font-black text-emerald-800">₹ {Number(summary?.finalAmount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          );
        })()}

        <p className="mt-6 text-[11px] text-slate-500">All prices are inclusive of GST and any other government taxes.</p>
      </PageWrapper>

      {/* ── PAGE 5: Terms & Conditions ── */}
      <PageWrapper>
        <Logo />
        <h2 className="text-3xl font-light text-slate-800 mb-8 uppercase tracking-widest">Terms &amp; Conditions</h2>
        
        <div className="space-y-8 text-sm">
          <div className="text-[11px] text-slate-800 leading-snug space-y-1.5">
            <p>1. Delivery Time - Delivery will be made within the estimated timeline after order confirmation.</p>
            <p>2. Payment Terms - Payment must be made as 100 % per agreed terms and schedule.</p>
            <p>3. RTGS / Bank Information - Payments should be transferred only to the provided bank account details.</p>
            <p>4. Order Confirmation - Orders will be confirmed only upon receipt of the purchase order and an advance payment of 70%.</p>
            <p>5. Invoice Details - The invoice will be issued once the order dispatch has been verified.</p>
            <p>6. Delivery Address &amp; Delivery Terms - Goods will be delivered to the address provided by the customer.</p>
            <p>7. Delivery Restrictions - Any problem with the product must be reported within a maximum time span of 48 hours.</p>
            <p>8. Delivery Timeline &amp; Post-Delivery Requests - Any changes or requests after delivery may incur additional charges.</p>
            <p>9. Cancellation of Order or Any Item - Cancellation is subject to approval and applicable cancellation charges.</p>
            <p>10. Sales Return Policy - Returns are accepted only as per company policy and within specified time.</p>
            <p>11. Inspection of Goods - Goods must be inspected at the time of delivery.</p>
            <p>12. Freight Charges - Are applicable extra and vary depending on distance and material.</p>
            <p>13. Services - Installation or service, if any, will be provided as per agreed terms.</p>
            <p>14. Service Contact Person - Any service-related communication must be coordinated through the respective company technician as part of the grievance process.</p>
            <p>15. Dispatch Contact Person &amp; Details - Dispatch updates will be shared by the designated dispatch contact.</p>
            <p>16. Address Information - Customer must provide complete and correct address details.</p>
            <p>17. Force Majeure / Act of God - Delays due to uncontrollable events are not the seller's responsibility. The company shall not be held accountable in the event of any uncertainty or unforeseen circumstances..</p>
            <p>18. Disclaimer - Images, samples, and descriptions are for reference only.</p>
            <p>19. Jurisdiction &amp; Governing Law - This agreement shall be governed by the laws of India, and the courts at Raipur, Chhattisgarh shall have exclusive jurisdiction over all disputes arising here from.</p>
          </div>

          <div className="flex justify-between items-start mt-12">
            <div>
              <h3 className="font-bold text-slate-800 mb-4 uppercase">RTGS Information</h3>
              <div className="space-y-2 text-slate-700">
                <div className="flex"><span className="w-32">Name</span> <span>: PAREKH SANITARY STORES</span></div>
                <div className="flex"><span className="w-32">Bank Name</span> <span>: INDUSIND BANK LTD.</span></div>
                <div className="flex"><span className="w-32">Bank Address</span> <span>: MG ROAD, RAIPUR</span></div>
                <div className="flex"><span className="w-32">Account No</span> <span>: 6500141113803</span></div>
                <div className="flex"><span className="w-32">IFSC Code</span> <span>: INDB0000841</span></div>
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="font-bold text-slate-800 mb-3 uppercase">Scan for UPI</h3>
              <div className="p-1 border-2 border-red-700 inline-block bg-white shadow-sm">
                <img src={upiImg} alt="UPI QR Code" className="w-32 h-32 object-contain" />
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-slate-500 mb-10">Authorized Signatory</div>
              <div className="text-sm font-semibold text-slate-800 border-t border-slate-300 pt-2 inline-block min-w-[200px]">For Parekh Sanitary Stores</div>
            </div>
          </div>
          <div className="mt-8 text-center text-xs text-slate-400">
            This is a computer-generated {documentTitle.toLowerCase()}. No signature is required.
          </div>
        </div>
      </PageWrapper>

      {/* ── PAGE 6: Brand Showcase & Final Footer ── */}
      <PageWrapper isLast={true}>
        <Logo />
        
        <div className="mt-6 p-0 mb-8 print:mb-4 flex flex-col justify-center items-center">
          <img src={thirdImg} alt="Brand Showcase" className="w-full max-h-[700px] print:max-h-[400px] object-contain" />
        </div>

        <div className="bg-black text-white p-12 print:p-6 mt-auto print:bg-black" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <h2 className="text-center text-xl print:text-lg font-medium tracking-widest mb-12 print:mb-6 uppercase">
            Central India's Largest Bathroom Solution Showroom
          </h2>
          
          <div className="flex flex-col items-center mb-10 print:mb-6">
            <img src={pgLogo} alt="Parekh Gallerium Logo" className="w-24 h-auto object-contain mb-2" />
            <h3 className="text-3xl print:text-2xl font-bold tracking-widest mt-4 mb-2">PAREKH GALLERIUM</h3>
            <p className="text-xs text-center text-slate-300 tracking-wider leading-relaxed">
              SANITARY WARE | BATHROOM FIXTURES | SWIMMING POOL | SPA &amp; JACUZZI<br/>
              TILES &amp; WOODEN FLOORING | PLUMBING &amp; PIPING | FALSE CEILING |<br/>
              WINDOWS AND DOORS
            </p>
          </div>

          <div className="flex justify-center gap-16 print:gap-8 text-xs text-slate-300">
            <div className="text-right space-y-1">
              <h4 className="font-bold text-white uppercase tracking-wider mb-2">Corporate Office</h4>
              <p>C - 1,3 &amp; 4, Rishab Complex,</p>
              <p>M.G. Road, Raipur (C.G.)</p>
              <p>Ph.: 0771 - 4700501, 4031480</p>
              <p>Fax: 0771 - 4700501</p>
            </div>
            <div className="w-px bg-slate-700"></div>
            <div className="text-left space-y-1">
              <h4 className="font-bold text-white uppercase tracking-wider mb-2">Display Center</h4>
              <p>Old Dhamtari Road, Pachpedi Naka</p>
              <p>Opposite Colours Mall,</p>
              <p>Raipur (C.G.)</p>
              <p>Ph.: 0771 - 4900603, 4900601</p>
              <p>Mo.: +91 78800 11158</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-4 print:mt-1 px-2">
          <span>Page 6</span>
          <span>Document made through Botivate, an IMS Software</span>
        </div>
      </PageWrapper>

    </div>
  );
}
