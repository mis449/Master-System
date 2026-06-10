import React from 'react';
import { Mail, Instagram, MapPin } from 'lucide-react';
import logoImg from '../../Assets/images.png';
import firstImg from '../../Assets/first.png';
import secondImg from '../../Assets/second.png';
import thirdImg from '../../Assets/third.png';
import pgLogo from '../../Assets/pglogo.png';

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
  const qrCode = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=parekh@upi&pn=Parekh%20Gallerium";

  const quotationNo = initialData?.quotationNo || initialData?.docNo || 'Draft';
  const createdOn = initialData?.date || initialData?.docDate || new Date().toISOString().split('T')[0];
  const salesperson = otherInfo?.salesPerson || initialData?.salesPerson || 'Admin';

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
      <img src={logoImg} alt="Parekh Sanitary Stores Logo" className="h-28 print:h-24 object-contain scale-[1.6] origin-left" />
    </div>
  );

  // Page wrapper — auto-height, never clips content
  const PageWrapper = ({ children, isLast = false, className = '' }) => (
    <div
      className={`w-full bg-white relative ${isLast ? '' : 'break-after-page mb-8 print:mb-0'} ${className}`}
      style={{ padding: '8mm 10mm', boxSizing: 'border-box' }}
    >
      {children}
    </div>
  );

  return (
    <div className="w-full text-slate-800 font-sans print:!bg-transparent" id="premium-quotation-print" style={{ backgroundColor: '#f8fafc' }}>
      <style type="text/css" media="print">
        {`
          @page {
            size: A4;
            margin: 8mm 10mm;
          }
        `}
      </style>
      
      {/* ── PAGE 1: Cover + Client Info (merged) ── */}
      <PageWrapper>
        {/* Header: Logo + Doc details */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <img src={logoImg} alt="Parekh Sanitary Stores Logo" className="h-20 object-contain scale-[1.6] origin-left" />
          </div>
          <div className="text-sm space-y-1 text-slate-600 text-right">
            <div><span className="font-medium mr-2">Document # :</span> {quotationNo}</div>
            <div><span className="font-medium mr-2">Created On :</span> {formattedDate}</div>
          </div>
        </div>

        {/* Cover image — bigger to fill more of the page */}
        <div className="mb-4 rounded-lg overflow-hidden">
          <img src={coverImage} alt="Luxury Bathroom Cover" className="w-full object-cover object-center" style={{ maxHeight: '340px', minHeight: '260px' }} />
        </div>

        {/* Document Title */}
        <div className="mb-4">
          <h1 className="text-4xl font-light tracking-wider text-slate-800">{documentTitle}</h1>
        </div>

        {/* Two-column: vertical image left, client info right */}
        <div className="flex gap-8 items-stretch">
          <div className="w-[40%] rounded-lg overflow-hidden" style={{ minHeight: '320px' }}>
            <img src={verticalImage} alt="Bathroom details" className="w-full h-full object-cover" style={{ display: 'block' }} />
          </div>
          <div className="w-[60%] flex flex-col py-2">
            <table className="text-[15px] text-slate-800 mb-6 border-collapse" style={{ borderSpacing: 0 }}>
              <tbody>
                <tr>
                  <td className="font-semibold pr-3 py-1.5 whitespace-nowrap align-top" style={{ minWidth: '155px' }}>Client Name</td>
                  <td className="pr-2 py-1.5 align-top">:</td>
                  <td className="py-1.5 uppercase align-top font-medium">{basicInfo?.customer || 'Walk-in Customer'}</td>
                </tr>
                {basicInfo?.areaPinCode && (
                  <tr>
                    <td className="py-0.5"></td>
                    <td className="py-0.5"></td>
                    <td className="py-0.5 text-slate-600">{basicInfo.areaPinCode}</td>
                  </tr>
                )}
                {basicInfo?.address && (
                  <tr>
                    <td className="py-0.5"></td>
                    <td className="py-0.5"></td>
                    <td className="py-0.5 uppercase text-slate-600">{basicInfo.address}</td>
                  </tr>
                )}
                {basicInfo?.cityState && (
                  <tr>
                    <td className="py-0.5"></td>
                    <td className="py-0.5"></td>
                    <td className="py-0.5 uppercase text-slate-600">{basicInfo.cityState}, India</td>
                  </tr>
                )}
                <tr><td colSpan="3" className="py-2"></td></tr>
                <tr>
                  <td className="font-semibold pr-3 py-1.5 whitespace-nowrap">Client Number</td>
                  <td className="pr-2 py-1.5">:</td>
                  <td className="py-1.5">{basicInfo?.mobile || '-'}</td>
                </tr>
                <tr>
                  <td className="font-semibold pr-3 py-1.5 whitespace-nowrap">Client Location</td>
                  <td className="pr-2 py-1.5">:</td>
                  <td className="py-1.5 uppercase">{basicInfo?.cityState?.split('/')[0] || '-'}</td>
                </tr>
                <tr>
                  <td className="font-semibold pr-3 py-1.5 whitespace-nowrap">Architect Name</td>
                  <td className="pr-2 py-1.5">:</td>
                  <td className="py-1.5 uppercase">{otherInfo?.architectName || '-'}</td>
                </tr>
                <tr>
                  <td className="font-semibold pr-3 py-1.5 whitespace-nowrap">Salesperson</td>
                  <td className="pr-2 py-1.5">:</td>
                  <td className="py-1.5 uppercase">{salesperson}</td>
                </tr>
                <tr>
                  <td className="font-semibold pr-3 py-1.5 whitespace-nowrap">Sales Number</td>
                  <td className="pr-2 py-1.5">:</td>
                  <td className="py-1.5">{otherInfo?.salesNumber || '-'}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-auto space-y-3">
              <div className="flex items-center gap-3 text-[14px] text-slate-700">
                <div className="w-7 h-7 flex items-center justify-center bg-red-100 text-red-500 rounded"><Mail size={16} /></div>
                <span>info@parekhgallerium.com</span>
              </div>
              <div className="flex items-center gap-3 text-[14px] text-slate-700">
                <div className="w-7 h-7 flex items-center justify-center bg-pink-100 text-pink-500 rounded"><Instagram size={16} /></div>
                <span>parekh_gallerium</span>
              </div>
              <div className="flex items-start gap-3 text-[14px] text-slate-700">
                <div className="w-7 h-7 flex items-center justify-center bg-blue-100 text-blue-500 rounded shrink-0"><MapPin size={16} /></div>
                <span className="leading-relaxed">6M84+9HF, New Dhamtari Rd, RishabhNagar<br/>and Pawan Vihar Colony, Pachpedi Naka,<br/>Raipur, Tikrapara, Chhattisgarh 492001</span>
              </div>
            </div>
          </div>
        </div>
      </PageWrapper>


      {/* ── PAGE 3: Product Details ── */}
      <PageWrapper>
        <Logo />
        <h2 className="text-3xl font-bold text-slate-800 mb-6 uppercase tracking-wider">Product Details</h2>
        
        <div className="space-y-6">
          {(() => {
            const groupedSections = [];
            let currentSection = {
              id: 'default',
              name: '',
              items: [],
            };

            let currentSubtotal = { qty: 0, amt: 0 };
            let hasItemsSinceLastSubtotal = false;

            const itemsFiltered = items?.filter(item => item.itemCode || item.description) || [];

            // Helper to push a subtotal row to current section
            const pushSubtotal = () => {
              if (hasItemsSinceLastSubtotal) {
                currentSection.items.push({
                  isSubtotal: true,
                  qty: currentSubtotal.qty,
                  amount: currentSubtotal.amt
                });
                currentSubtotal = { qty: 0, amt: 0 };
                hasItemsSinceLastSubtotal = false;
              }
            };

            itemsFiltered.forEach((item, index) => {
              if (item.type === 'section') {
                pushSubtotal();
                if (currentSection.items.length > 0 || currentSection.name !== '') {
                  groupedSections.push(currentSection);
                }
                currentSection = {
                  id: item.id || index,
                  name: item.description,
                  items: []
                };
              } else if (item.type === 'subsection') {
                // Do NOT push subtotal here — totals accumulate across all subsections
                // and are only shown at section end
                currentSection.items.push({
                  isSubsection: true,
                  description: item.description
                });
              } else {
                const unitPrice = Number(item.unitPrice || 0);
                const discountPercent = Number(item.discountPercent || 0);
                const netRate = unitPrice - (unitPrice * (discountPercent / 100));
                const amount = netRate * (Number(item.quantity) || 0);

                const matchedInventoryItem = inventoryItems?.find(i => (i.ItemCode || i.code) === item.itemCode);
                const imageUrl = item.thumbnail || item.image || (matchedInventoryItem ? (matchedInventoryItem.Thumbnail || matchedInventoryItem.product_image_url) : '');

                currentSubtotal.qty += Number(item.quantity) || 0;
                currentSubtotal.amt += amount;
                hasItemsSinceLastSubtotal = true;

                currentSection.items.push({ ...item, amount, netRate, unitPrice, discountPercent, imageUrl });
              }
            });

            pushSubtotal();
            if (currentSection.items.length > 0 || currentSection.name !== '') {
              groupedSections.push(currentSection);
            }

            return groupedSections.map((section, sIdx) => (
              <table key={section.id || sIdx} className="w-full text-left text-sm border-collapse mb-2" style={{ pageBreakInside: 'auto', tableLayout: 'fixed' }}>
                <thead className="table-header-group">
                  {section.name && (
                    <tr>
                      <th colSpan="7" className="pt-6 pb-2 px-2 bg-white text-left font-medium text-black text-[24px] uppercase tracking-wide">
                        {section.name}
                      </th>
                    </tr>
                  )}
                  <tr className="bg-white text-slate-800 font-medium border-y border-black text-[13px] tracking-wide">
                    <th className="py-2 px-2 text-center w-[15%]">Image</th>
                    <th className="py-2 px-2 text-left w-[40%]">Product Details</th>
                    <th className="py-2 px-2 text-center w-[8%]">Qty</th>
                    <th className="py-2 px-2 text-right w-[11%]">MRP</th>
                    <th className="py-2 px-2 text-right w-[7%]">Dis%</th>
                    <th className="py-2 px-2 text-right w-[10%]">Net rate</th>
                    <th className="py-2 px-2 text-right w-[9%]">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((item, idx) => {
                    if (item.isSubtotal) {
                      return (
                        <tr key={`subtotal-${idx}`} className="border-y-2 border-black break-inside-avoid">
                          <td colSpan="2" className="py-4 px-3 text-center font-bold text-slate-800 text-sm uppercase tracking-widest">Total</td>
                          <td className="py-4 px-3 text-center font-bold text-slate-800 text-sm">{item.qty}</td>
                          <td colSpan="3"></td>
                          <td className="py-4 px-3 text-right font-bold text-slate-900 text-sm">₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    }

                    if (item.isSubsection) {
                      return (
                        <tr key={`sub-${idx}`} className="break-inside-avoid">
                          <td colSpan="7" className="py-2 px-2 text-center bg-gray-200 font-bold text-black text-[13px] uppercase tracking-wider border-y border-gray-400">
                            {item.description}
                          </td>
                        </tr>
                      );
                    }

                    const matchedInventoryItem = inventoryItems?.find(i => (i.ItemCode || i.code) === item.itemCode);

                    return (
                      <tr key={idx} className="border-b border-slate-100 break-inside-avoid">
                        <td className="py-4 px-2 text-center align-middle">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="product" className="w-full aspect-square max-w-[140px] object-contain mx-auto" />
                          ) : (
                            <div className="w-full aspect-square max-w-[140px] flex items-center justify-center text-slate-300 mx-auto">
                              <span className="text-xs">No Img</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-2 text-left align-top">
                          <div className="font-bold text-slate-900 text-[14px] mb-1.5">{item.itemCode || '-'}</div>
                          <div className="text-slate-700 text-[13px] leading-relaxed mb-2">{item.description || '-'}</div>
                          {matchedInventoryItem?.Brand && (
                            <div className="text-slate-600 text-[13px]">Brand - {matchedInventoryItem.Brand}</div>
                          )}
                        </td>
                        <td className="py-4 px-2 text-center align-top">
                          <div className="text-slate-800 text-[14px]">{item.quantity}</div>
                          <div className="text-slate-600 text-[11px] mt-1 uppercase">PCS</div>
                        </td>
                        <td className="py-4 px-2 text-right align-top text-slate-800 text-[13px]">₹ {item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        {/* Fixed: was showing ₹ symbol instead of % for discount */}
                        <td className="py-4 px-2 text-right align-top text-slate-800 text-[13px] whitespace-nowrap">{item.discountPercent > 0 ? `${Number(item.discountPercent).toFixed(2)}%` : '-'}</td>
                        <td className="py-4 px-2 text-right align-top text-slate-800 text-[13px]">₹ {item.netRate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="py-4 px-2 text-right align-top text-slate-900 text-[13px]">₹ {item.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ));
          })()}
        </div>
      </PageWrapper>

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
              const qty = Number(item.quantity || 0);
              const mrp = unitPrice * qty;
              const disc = mrp * (discountPercent / 100);
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

          if (sectionSummaryData.length === 0) return null;

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
          <div>
            <h3 className="font-bold text-slate-800 mb-4 uppercase">General</h3>
            <ul className="space-y-2 text-slate-700 uppercase leading-relaxed list-none">
              <li>1) Special order products will not be taken back or exchanged.</li>
              <li>2) Interest of 24% P.A will be charged if payment of bill is not made within given timeline.</li>
              <li>3) Disputes if any are subject to Raipur jurisdiction only.</li>
              <li>4) If any warranty passed to customer is purely from the manufacture only.</li>
              <li>5) Please check the goods before accepting.</li>
              <li>6) Refund will be made by cheque for returned goods.</li>
              <li>7) Goods will not be returned and exchanged on Sunday and Saturday.</li>
              <li>8) Payment 100% Advance.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-slate-800 mb-2 uppercase">Price Validity</h3>
            <p className="text-slate-700">{basicInfo?.validityDate ? formatDate(basicInfo.validityDate) : '30 Days from Quotation Date'}</p>
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
              <div className="p-2 border-2 border-red-700 rounded inline-block bg-white shadow-sm">
                <img src={qrCode} alt="UPI QR Code" className="w-32 h-32" />
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
        
        <div className="border border-slate-200 rounded-xl p-8 print:p-4 mb-8 print:mb-4 flex flex-col justify-center shadow-sm items-center">
          <img src={thirdImg} alt="Brand Showcase" className="w-full max-h-[500px] print:max-h-[250px] object-contain" />
        </div>

        <div className="bg-black text-white p-12 print:p-6 rounded-xl mt-auto print:bg-black" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
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
