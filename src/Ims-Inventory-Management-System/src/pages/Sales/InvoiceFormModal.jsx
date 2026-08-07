import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import ModalForm from '../../components/ModalForm';
import useDataStore from '../../store/dataStore';
import CustomerDetailsSection from '../../components/sales/CustomerDetailsSection';
import SalesTabs from '../../components/sales/SalesTabs';
import ItemLinesTable from '../../components/sales/ItemLinesTable';
import SummaryCard from '../../components/sales/SummaryCard';
import SalesHeader from '../../components/sales/SalesHeader';

import NewCustomerModal from '../QuotationForm/NewCustomerModal';
import CatalogModal from '../QuotationForm/CatalogModal';
import OtherInformationTab from '../../components/OtherInformationTab';
import InvoicePrintPreview from '../../components/sales/InvoicePrintPreview';
import { X, Image as ImageIcon } from 'lucide-react';
import BrandDiscountModal from '../QuotationForm/BrandDiscountModal';

export default function InvoiceFormModal({ isOpen, onClose, onSave, initialData, onCreateSalesReturn }) {
  const [activeTab, setActiveTab] = useState('ItemLines');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [printOrientation, setPrintOrientation] = useState('Portrait');
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isBrandDiscountOpen, setIsBrandDiscountOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' });
  
  const { items: inventoryItems, fetchItems, addCustomer, customers, fetchCustomers } = useDataStore();

  useEffect(() => {
    if (isOpen) {
      fetchItems(true);
      fetchCustomers();
    }
  }, [isOpen, fetchItems, fetchCustomers]);

  const [basicInfo, setBasicInfo] = useState({
    customer: '', address: '', validityDate: '', priceList: '>->MRP:01-Apr-2025', paymentTerms: 'Net 30', areaPinCode: '', cityState: '', email: '', mobile: ''
  });

  const getEmptyItem = (type = 'item') => ({ id: Date.now() + Math.random(), type, itemCode: '', description: '', quantity: 1, unitPrice: 0, discountPercent: 0, taxPercent: 18, netAmount: 0 });
  const [items, setItems] = useState([getEmptyItem()]);

  const [otherInfo, setOtherInfo] = useState({
    salesPerson: '', salesNumber: '', quortPerson: '', quortMobile: '', referenceNumber: '', customerReference: '', expectedDeliveryDate: '', internalNotes: '', mobile: '', state: ''
  });

  const [notes, setNotes] = useState({
    remarks: '', termsAndConditions: '', additionalNotes: ''
  });

  const [summary, setSummary] = useState({
    grossAmount: 0, discountAmount: 0, taxAmount: 0, roundOffAmount: 0, totalAmount: 0
  });

  // Pre-fill if converting from Quotation
  useEffect(() => {
    if (isOpen && initialData) {
      if (initialData.details) {
        setBasicInfo({
          customer: '',
          address: '',
          validityDate: '',
          priceList: '>->MRP:01-Apr-2025',
          paymentTerms: 'Net 30',
          areaPinCode: '',
          cityState: '',
          email: '',
          mobile: '',
          ...(initialData.details.basicInfo || {})
        });
        const loadedItems = (initialData.details.items || [getEmptyItem()]).map(item => ({
          ...item,
          orderedQty: item.orderedQty !== undefined ? item.orderedQty : (item.quantity || 0)
        }));
        setItems(loadedItems);
        setOtherInfo({
          ...initialData.details.otherInfo,
          referenceNumber: initialData.quotationNo || ''
        });
        setNotes(initialData.details.notes || notes);
      }
    }
  }, [isOpen, initialData]);

  // Auto-fill customer details if a customer name is pre-filled but details are missing
  useEffect(() => {
    if (isOpen && basicInfo.customer && customers && customers.length > 0) {
      // Check if mobile or email is missing, indicating we need to fetch details
      if (!basicInfo.mobile && !basicInfo.email && !basicInfo.areaPinCode) {
        const matched = customers.find(c => c.name === basicInfo.customer);
        if (matched) {
          setBasicInfo(prev => ({
            ...prev,
            address: prev.address || matched.address || '',
            priceList: prev.priceList || matched.priceList || 'Standard',
            areaPinCode: prev.areaPinCode || matched.areaPinCode || '',
            cityState: prev.cityState || matched.cityState || '',
            email: prev.email || matched.email || '',
            mobile: prev.mobile || matched.mobile || ''
          }));
          setOtherInfo(prev => ({
            ...prev,
            salesPerson: prev.salesPerson || matched.salesPerson || 'Admin',
            salesNumber: prev.salesNumber || matched.salesNo || '',
            quortPerson: prev.quortPerson || matched.quortPerson || '',
            quortMobile: prev.quortMobile || matched.quortMobileNumber || '',
            mobile: prev.mobile || matched.mobile || '',
            state: prev.state || (matched.cityState ? matched.cityState.split('/')[1]?.trim() : '')
          }));
        }
      }
    }
  }, [isOpen, basicInfo.customer, customers, basicInfo.mobile, basicInfo.email, basicInfo.areaPinCode]);

  useEffect(() => {
    let gross = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const newItems = items.map(item => {
      if (item.type && item.type !== 'item') return { ...item, netAmount: 0 };
      const rowGross = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
      const rowDiscount = rowGross * ((Number(item.discountPercent) || 0) / 100);
      const afterFirstDiscount = rowGross - rowDiscount;
      const rowAddDiscount = afterFirstDiscount * ((Number(item.addDiscount) || 0) / 100);
      const afterDiscount = afterFirstDiscount - rowAddDiscount;
      const rowTax = afterDiscount * ((Number(item.taxPercent) || 0) / 100);
      const net = afterDiscount + rowTax;
      
      gross += rowGross;
      totalDiscount += (rowDiscount + rowAddDiscount);
      totalTax += rowTax;

      return { ...item, netAmount: net };
    });

    const total = gross - totalDiscount + totalTax;
    const roundedTotal = Math.round(total);
    const roundOff = roundedTotal - total;

    setSummary(prev => ({
      ...prev,
      grossAmount: gross,
      discountAmount: totalDiscount,
      taxAmount: totalTax,
      roundOffAmount: roundOff,
      totalAmount: roundedTotal
    }));
  }, [items]);

  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleItemCodeSelect = (code, rowId) => {
    const item = inventoryItems.find(i => (i.ItemCode || i.code) === code);
    if (item) {
      setItems(prev => {
        const newItems = prev.map(p => p.id === rowId ? {
          ...p,
          itemCode: code,
          description: item.ItemName || item.name || '',
          unitPrice: Number(item.MRP || item.price || 0),
          thumbnail: item.Thumbnail || item.product_image_url || ''
        } : p);
        if (prev[prev.length - 1].id === rowId) newItems.push(getEmptyItem('item'));
        return newItems;
      });
    }
  };

  const handleCatalogSubmit = (cartItems) => {
    if (cartItems.length === 0) return;
    setItems(prev => {
      let newItems = [...prev];
      let insertIndex = newItems.findIndex(i => i.type === 'item' && !i.itemCode);
      cartItems.forEach(cartItem => {
        const newItem = {
          id: Date.now() + Math.random(), type: 'item', itemCode: cartItem.ItemCode || cartItem.code, description: cartItem.ItemName || cartItem.name || '', quantity: cartItem.selectedQty, unitPrice: Number(cartItem.MRP || cartItem.price || 0), discountPercent: 0, taxPercent: 18, netAmount: 0
        };
        if (insertIndex !== -1) { newItems[insertIndex] = newItem; insertIndex = -1; } 
        else { newItems.push(newItem); }
      });
      newItems.push(getEmptyItem('item'));
      return newItems;
    });
  };

  const handleApplyBrandDiscount = (brandDiscounts) => {
    setItems(prev => {
      const updatedItems = prev.map(item => {
        if (item.type === 'item' && item.itemCode) {
          const invItem = inventoryItems.find(i => (i.ItemCode || i.code) === item.itemCode);
          let rawBrand = invItem ? (invItem.BrandName || invItem.brand || '') : '';
          if (typeof rawBrand === 'string') rawBrand = rawBrand.trim();
          const brand = rawBrand ? rawBrand : 'NO BRAND';
          
          if (brandDiscounts.hasOwnProperty(brand)) {
            return { ...item, discountPercent: brandDiscounts[brand] };
          }
        }
        return item;
      });
      return updatedItems;
    });
    toast.success("Brand-wise discounts applied successfully");
  };

  const addItemLine = (index) => setItems(prev => {
    const newItem = getEmptyItem('item');
    if (typeof index === 'number') {
      const newItems = [...prev];
      newItems.splice(index + 1, 0, newItem);
      return newItems;
    }
    return [...prev, newItem];
  });
  const addSection = () => setItems(prev => [...prev, getEmptyItem('section')]);
  const addSubSection = () => setItems(prev => [...prev, getEmptyItem('subsection')]);
  const copySection = (sectionId) => {
    setItems(prev => {
      const sectionIndex = prev.findIndex(i => i.id === sectionId);
      if (sectionIndex === -1) return prev;

      const sectionType = prev[sectionIndex].type;
      let endIndex = sectionIndex + 1;
      while (endIndex < prev.length) {
        if (sectionType === 'section' && prev[endIndex].type === 'section') break;
        if (sectionType === 'subsection' && (prev[endIndex].type === 'section' || prev[endIndex].type === 'subsection')) break;
        endIndex++;
      }

      const itemsToCopy = prev.slice(sectionIndex, endIndex).map(item => ({
        ...item,
        id: Date.now() + Math.random(),
        description: item.id === sectionId ? `${item.description} (Copy)` : item.description
      }));

      const newItems = [...prev];
      newItems.splice(endIndex, 0, ...itemsToCopy);
      return newItems;
    });
  };
  const removeItemLine = (id) => { if (items.length > 1) setItems(prev => prev.filter(item => item.id !== id)); };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!basicInfo.customer) { toast.error('Customer name is required'); return; }

    setIsSubmitting(true);
    try {
      const isExistingInvoice = initialData && initialData.id;
      const formattedItems = items.map(item => {
        if (item.type !== 'item') return item;
        const qty = Number(item.quantity || 0);
        const invItem = inventoryItems?.find(i => (i.ItemCode || i.code) === item.itemCode);
        const dispQty = item.dispatchQty !== undefined ? Number(item.dispatchQty) : qty;
        const prevDisp = Number(item.dispatchedQty || 0);
        return {
          ...item,
          stock: item.stock !== undefined ? Number(item.stock) : (invItem ? Number((invItem.StockQty || 0).toFixed(1)) : 0),
          orderedQty: item.orderedQty !== undefined ? Number(item.orderedQty) : qty,
          dispatchQty: dispQty,
          dispatchedQty: prevDisp > 0 ? prevDisp : dispQty,
          thumbnail: item.thumbnail !== undefined ? item.thumbnail : (invItem ? (invItem.Thumbnail || invItem.product_image_url || '') : '')
        };
      });

      const invoiceData = {
        // Pass id so InvoiceList knows this is an update
        ...(isExistingInvoice ? { id: initialData.id } : {}),
        invoiceNo: isExistingInvoice ? initialData.invoiceNo : undefined,
        date: isExistingInvoice ? initialData.date : new Date().toISOString().split('T')[0],
        customerName: basicInfo.customer,
        customer: basicInfo.customer,
        mobileNumber: basicInfo.mobile || otherInfo.mobile || initialData?.mobileNumber || '-',
        state: basicInfo.cityState
          ? (basicInfo.cityState.includes('/') ? basicInfo.cityState.split('/')[1]?.trim() : basicInfo.cityState)
          : (otherInfo.state || initialData?.state || '-'),
        salesPerson: otherInfo.salesPerson || 'Admin',
        totalAmount: summary.totalAmount,
        status: initialData?.status || 'Active',
        paymentStatus: initialData?.paymentStatus || '-',
        challan_id: initialData?.challan_no ? initialData.id : initialData?.challan_id,
        details: { basicInfo, items: formattedItems, otherInfo, notes, summary }
      };

      onSave(invoiceData);
    } catch (error) {
      console.error('Invoice submit error:', error);
      toast.error('Failed to save invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title=""
      onSubmit={handleSubmit}
      hideHeader={true}
      hideFooter={true}
      maxWidth="max-w-[98vw] w-[98vw]"
    >
      <div className="flex flex-col h-full min-h-[70vh]">
        
        {/* Custom Header matching screenshot */}
        <SalesHeader 
          title="Edit Invoice"
          docNumber={initialData?.invoiceNo || "New Invoice"}
          docDate={initialData?.date || new Date().toLocaleString()}
          onDiscard={onClose}
          onCreateReturn={() => {
             if (!basicInfo.customer) { toast.error('Please save the invoice first'); return; }
             const currentData = { 
               id: initialData?.id,
               invoiceNo: initialData?.invoiceNo,
               customerName: basicInfo.customer,
               mobileNumber: otherInfo.mobile || initialData?.mobileNumber || '-',
               state: otherInfo.state || initialData?.state || '-',
               salesPerson: otherInfo.salesPerson || 'Admin',
               details: { basicInfo, items, otherInfo, notes, summary } 
             };
             onCreateSalesReturn(currentData);
          }}
          showCreateReturn={true}
          printOrientation={printOrientation}
          setPrintOrientation={setPrintOrientation}
          onPrintPreview={() => setIsPrintPreviewOpen(true)}
          onSendEmail={() => {
            setEmailForm({
              to: basicInfo.email || '',
              subject: `Invoice details - ${initialData?.invoiceNo || 'Draft'}`,
              body: `Dear Customer,\n\nPlease find the summary of your invoice below:\n\nInvoice No: ${initialData?.invoiceNo || 'Draft'}\nTotal Amount: ₹${summary.totalAmount}\nValidity Date: ${basicInfo.validityDate || '-'}\nPayment Terms: ${basicInfo.paymentTerms || '-'}\n\nBest regards,\nParekh Gallerium Team`
            });
            setIsEmailModalOpen(true);
          }}
          onSaveForm={handleSubmit}
          isSubmitting={isSubmitting}
          saveText={isSubmitting ? (initialData?.invoiceNo ? 'Updating...' : 'Saving...') : (initialData?.invoiceNo ? 'Update Invoice' : 'Save Invoice')}
        />

        <div className="flex-1 space-y-6">
          <CustomerDetailsSection 
            basicInfo={basicInfo} 
            setBasicInfo={setBasicInfo} 
            onOpenCustomerModal={() => setIsCustomerModalOpen(true)} 
            onCustomerSelect={(custObj) => {
              if (!custObj) return;
              setBasicInfo(prev => ({
                ...prev,
                customer: custObj.name,
                address: custObj.address || prev.address,
                priceList: custObj.priceList || prev.priceList,
                areaPinCode: custObj.areaPinCode || prev.areaPinCode,
                cityState: custObj.cityState || prev.cityState,
                email: custObj.email || prev.email,
                mobile: custObj.mobile || prev.mobile
              }));
              setOtherInfo(prev => ({
                ...prev,
                salesPerson: custObj.salesPerson || prev.salesPerson,
                salesNumber: custObj.salesNo || prev.salesNumber,
                quortPerson: custObj.quortPerson || prev.quortPerson,
                quortMobile: custObj.quortMobileNumber || prev.quortMobile,
                mobile: custObj.mobile || prev.mobile,
                state: custObj.cityState ? custObj.cityState.split('/')[1]?.trim() : prev.state
              }));
            }}
          />

          <div className="min-h-[250px] py-4 space-y-4">
            <SalesTabs activeTab={activeTab} setActiveTab={setActiveTab} />
            
            {activeTab === 'ItemLines' && (
              <>
                <ItemLinesTable 
                  items={items}
                  inventoryItems={inventoryItems}
                  handleItemChange={handleItemChange}
                  handleItemCodeSelect={handleItemCodeSelect}
                  removeItemLine={removeItemLine}
                  addItemLine={addItemLine}
                  addSection={addSection}
                  addSubSection={addSubSection}
                  copySection={copySection}
                  setIsCatalogOpen={setIsCatalogOpen}
                  reorderItemLines={(dragIndex, dropIndex) => {
                    setItems(prev => {
                      const newItems = [...prev];
                      const draggedItem = newItems[dragIndex];
                      newItems.splice(dragIndex, 1);
                      newItems.splice(dropIndex, 0, draggedItem);
                      return newItems;
                    });
                  }}
                  showStatus={false}
                  openBrandDiscount={() => setIsBrandDiscountOpen(true)}
                />
                <SummaryCard 
                  summary={summary} 
                  onFinalAmountChange={(val) => setSummary(prev => ({ ...prev, finalAmount: val }))} 
                />
              </>
            )}

            {activeTab === 'OtherInfo' && (
              <OtherInformationTab 
                otherInfo={otherInfo} 
                setOtherInfo={setOtherInfo} 
              />
            )}

            {activeTab === 'Notes' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 px-2 py-4">
                <div className="space-y-1.5">
                  <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">Remarks</label>
                  <textarea 
                    value={notes.remarks || ''} 
                    onChange={(e) => setNotes(prev => ({ ...prev, remarks: e.target.value }))}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-sm bg-white outline-none"
                    rows={4}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">Terms &amp; Conditions</label>
                  <textarea 
                    value={notes.termsAndConditions || ''} 
                    onChange={(e) => setNotes(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-sm bg-white outline-none"
                    rows={4}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">Additional Notes</label>
                  <textarea 
                    value={notes.additionalNotes || ''} 
                    onChange={(e) => setNotes(prev => ({ ...prev, additionalNotes: e.target.value }))}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-sm bg-white outline-none"
                    rows={4}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </ModalForm>

    <NewCustomerModal 
      isOpen={isCustomerModalOpen} 
      onClose={() => setIsCustomerModalOpen(false)} 
      onSave={(c) => {
        setBasicInfo(prev => ({ 
          ...prev, 
          customer: c.company || c.customer || 'New Customer', 
          address: c.address || prev.address,
          areaPinCode: c.areaPinCode || '',
          cityState: c.cityState || '',
          email: c.email || '',
          mobile: c.mobile || ''
        }));
        setOtherInfo(prev => ({ ...prev, mobile: c.mobile || prev.mobile, state: c.cityState ? c.cityState.split('/')[1]?.trim() : prev.state, salesPerson: c.salesPerson || prev.salesPerson, quortPerson: c.quortPerson || prev.quortPerson, quortMobile: c.quortMobileNumber || prev.quortMobile }));
        addCustomer(c);
      }} 
    />
    <CatalogModal isOpen={isCatalogOpen} onClose={() => setIsCatalogOpen(false)} onSubmitCart={handleCatalogSubmit} />

    <BrandDiscountModal
      isOpen={isBrandDiscountOpen}
      onClose={() => setIsBrandDiscountOpen(false)}
      items={items}
      inventoryItems={inventoryItems}
      onApply={handleApplyBrandDiscount}
    />

    {/* Print Preview Modal */}
    {isPrintPreviewOpen && createPortal(
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex flex-col p-4 md:p-6 overflow-hidden pointer-events-auto" style={{ zIndex: 10000 }}>
        <style>
          {`
            @media print {
              /* Remove height/overflow limits from global containers */
              html, body, #root, #erp-main-container {
                height: auto !important;
                min-height: 100% !important;
                max-height: none !important;
                overflow: visible !important;
                position: static !important;
              }

              body * {
                visibility: hidden;
              }
              
              #invoice-print-area, #invoice-print-area * {
                visibility: visible;
              }
              
              /* Break out of the modal styling */
              .absolute.inset-0 {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                height: auto !important;
                min-height: 100% !important;
                overflow: visible !important;
                background: none !important;
                padding: 0 !important;
              }
              
              /* Let the container grow */
              .absolute.inset-0 > div {
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                overflow: visible !important;
                box-shadow: none !important;
                margin: 0 !important;
                border: none !important;
              }
              
              /* Let the print area grow and position at top */
              #invoice-print-area {
                height: auto !important;
                min-height: 0 !important;
                overflow: visible !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
              }
              
              /* Hide the control bar */
              .absolute.inset-0 > div > div:first-child {
                display: none !important;
              }
              
              .break-after-page {
                page-break-after: always;
                break-after: page;
              }
              
              @page {
                size: ${printOrientation === 'Horizontal' ? 'landscape' : 'portrait'};
                margin: 10mm;
              }
            }
          `}
        </style>
        
        {/* Unified Print Preview Container */}
        <div className={`w-full mx-auto flex flex-col flex-1 min-h-0 mt-10 shadow-2xl rounded-2xl ${
          printOrientation === 'Horizontal' ? 'max-w-[315mm]' : 'max-w-4xl'
        }`}>
          
          {/* Top Control Bar */}
          <div className="w-full bg-white rounded-t-2xl border border-slate-150 p-4 px-6 md:px-8 flex justify-between items-center z-50 flex-shrink-0 shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Print Preview</span>
              <select 
                value={printOrientation} 
                onChange={e => setPrintOrientation(e.target.value)}
                className="ml-4 text-xs border border-slate-200 rounded px-2 py-1 outline-none"
              >
                <option value="Portrait">Portrait</option>
                <option value="Horizontal">Landscape</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  const scrollArea = document.getElementById('invoice-print-area');
                  const targetElement = scrollArea ? scrollArea.firstElementChild : null;
                  if (!targetElement) return;
                  const loadingToast = toast.loading('Generating PDF...');
                  try {
                    const htmlToImage = await import('html-to-image');
                    const jspdfModule = await import('jspdf');
                    const jsPDF = jspdfModule.jsPDF || jspdfModule.default?.jsPDF || jspdfModule.default;
                    
                    // We use html-to-image because html2canvas does not support oklch() colors used in Tailwind v4
                    const imgData = await htmlToImage.toPng(targetElement, { 
                      pixelRatio: 1.5, // Reduced for speed
                      backgroundColor: '#ffffff',
                      style: { transform: 'none' },
                      cacheBust: true,
                      skipFonts: true // Skips embedding remote fonts which often causes hanging/slowdowns
                    });
                    
                    const pdf = new jsPDF(printOrientation === 'Horizontal' ? 'l' : 'p', 'mm', 'a4');
                    // Image proportions
                    const imgProps = pdf.getImageProperties(imgData);
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                    
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                    pdf.save(`Invoice_${initialData?.invoiceNo || 'Draft'}.pdf`);
                    toast.success('PDF Downloaded!', { id: loadingToast });
                  } catch (error) {
                    console.error('Error generating PDF:', error);
                    toast.error('Failed: ' + (error.message || 'Unknown error'), { id: loadingToast });
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition shadow-sm"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition shadow-sm"
              >
                Print
              </button>
              <button
                type="button"
                onClick={() => setIsPrintPreviewOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-4 rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
          
          {/* Document Sheet Scrollable Area */}
          <div className="flex-1 w-full overflow-auto min-h-0 rounded-b-2xl bg-slate-500/10 p-4 md:p-6 flex flex-col items-center" id="invoice-print-area">
            <InvoicePrintPreview 
              initialData={initialData}
              basicInfo={basicInfo}
              otherInfo={otherInfo}
              items={items}
              summary={summary}
              orientation={printOrientation}
            />
          </div>
        </div>
      </div>,
      document.getElementById('erp-main-container') || document.body
    )}

    {/* Send Email Modal */}
    {isEmailModalOpen && createPortal(
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4 pointer-events-auto" style={{ zIndex: 10000 }}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Send Invoice by Email</h3>
            <button 
              type="button" 
              onClick={() => setIsEmailModalOpen(false)}
              className="p-1.5 hover:bg-slate-55 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              if (!emailForm.to) {
                toast.error("Recipient email address is required");
                return;
              }
              
              setIsSubmitting(true);
              const toastId = toast.loading("Sending email to " + emailForm.to + "...");
              
              try {
                // Simulate email send
                await new Promise(resolve => setTimeout(resolve, 1500));
                toast.success("Email sent successfully!", { id: toastId });
                setIsEmailModalOpen(false);
              } catch (err) {
                toast.error("Failed to send email.", { id: toastId });
              } finally {
                setIsSubmitting(false);
              }
            }} 
            className="p-6 space-y-4 text-left"
          >
            <div className="space-y-1">
              <label className="block text-[11px] text-slate-700 font-bold uppercase tracking-wider">Recipient Email (To) *</label>
              <input 
                type="email" 
                required 
                placeholder="customer@example.com" 
                value={emailForm.to} 
                onChange={(e) => setEmailForm({...emailForm, to: e.target.value})} 
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-xs md:text-sm h-[38px] bg-white outline-none" 
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] text-slate-700 font-bold uppercase tracking-wider">Subject</label>
              <input 
                type="text" 
                placeholder="Subject" 
                value={emailForm.subject} 
                onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})} 
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-xs md:text-sm h-[38px] bg-white outline-none" 
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] text-slate-700 font-bold uppercase tracking-wider">Message Body</label>
              <textarea 
                rows="6" 
                placeholder="Message details..." 
                value={emailForm.body} 
                onChange={(e) => setEmailForm({...emailForm, body: e.target.value})} 
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-xs md:text-sm bg-white outline-none font-mono" 
              />
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-4">
              <button 
                type="button" 
                onClick={() => setIsEmailModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-650 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-sky-100"
              >
                {isSubmitting ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.getElementById('erp-main-container') || document.body
    )}
    </>
  );
}
