import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import ModalForm from '../../components/ModalForm';
import useDataStore from '../../store/dataStore';
import { createPurchase, updatePurchase } from '../../services/PurchaseService';
import VendorDetailsSection from '../../components/purchase/VendorDetailsSection';
import NewVendorModal from '../../components/purchase/NewVendorModal';
import SalesTabs from '../../components/sales/SalesTabs';
import ItemLinesTable from '../../components/sales/ItemLinesTable';
import SummaryCard from '../../components/sales/SummaryCard';
import OtherInformationTab from '../../components/OtherInformationTab';
import CatalogModal from '../QuotationForm/CatalogModal';
import PremiumPurchasePrint from '../../components/purchase/PremiumPurchasePrint';
import { Printer, UploadCloud, MessageSquare, StickyNote, Activity, Image as ImageIcon } from 'lucide-react';

export default function PurchaseFormModal({ isOpen, onClose, onSave, initialData, isConversion = false }) {
  const [activeTab, setActiveTab] = useState('ItemLines');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printOrientation, setPrintOrientation] = useState('Portrait');
  const [purchaseStatus, setPurchaseStatus] = useState('Active');
  const [supplyStatus, setSupplyStatus] = useState('-');
  
  const { items: inventoryItems, fetchItems } = useDataStore();

  useEffect(() => {
    if (isOpen) fetchItems(true);
  }, [isOpen, fetchItems]);

  const [headerInfo, setHeaderInfo] = useState({
    materialRcvdDate: '',
    billNo: '',
    vendorBillNo: '',
    billDate: ''
  });

  const [basicInfo, setBasicInfo] = useState({
    vendor: '',
    address: '',
    areaPinCode: '',
    cityState: '',
    state: '',
    email: '',
    mobile: '',
    validityDate: '',
    priceList: 'Standard',
    paymentTerms: 'Net 30'
  });

  const getEmptyItem = (type = 'item') => ({ id: Date.now() + Math.random(), type, itemCode: '', description: '', quantity: 1, unitPrice: 0, discountPercent: 0, taxPercent: 18, netAmount: 0 });
  const [items, setItems] = useState([getEmptyItem()]);

  const [otherInfo, setOtherInfo] = useState({
    internalNotes: ''
  });

  const [notes, setNotes] = useState({
    remarks: '',
    termsAndConditions: ''
  });

  const [summary, setSummary] = useState({
    grossAmount: 0,
    discountAmount: 0,
    taxAmount: 0,
    roundOffAmount: 0,
    totalAmount: 0
  });

  useEffect(() => {
    if (initialData) {
      if (initialData.details && initialData.details.basicInfo) {
        setBasicInfo(initialData.details.basicInfo);
      } else if (initialData.vendorName) {
        setBasicInfo(prev => ({ ...prev, vendor: initialData.vendorName }));
      }
      if (initialData.details?.items) {
        setItems(initialData.details.items.map(item => ({...item, id: Date.now() + Math.random()})));
      }
      if (initialData.details?.otherInfo) {
        setOtherInfo(initialData.details.otherInfo);
      }
      if (initialData.details?.notes) {
        setNotes(initialData.details.notes);
      }
      if (initialData.details?.summary) {
        setSummary(initialData.details.summary);
      }
      if (initialData.billNo) setHeaderInfo(prev => ({...prev, billNo: initialData.billNo}));
      if (initialData.billDate) setHeaderInfo(prev => ({...prev, billDate: initialData.billDate}));

      setPurchaseStatus(initialData.status === 'Draft' ? 'Active' : initialData.status || 'Active');
      setSupplyStatus(initialData.supplyStatus || '-');
    } else {
        setBasicInfo({ vendor: '', address: '', areaPinCode: '', cityState: '', state: '', email: '', mobile: '', validityDate: '', priceList: 'Standard', paymentTerms: 'Net 30' });
        setItems([getEmptyItem()]);
        setOtherInfo({ internalNotes: '' });
        setNotes({ remarks: '', termsAndConditions: '' });
        setSummary({ grossAmount: 0, discountAmount: 0, taxAmount: 0, roundOffAmount: 0, totalAmount: 0 });
        setPurchaseStatus('Active');
        setSupplyStatus('-');
        setHeaderInfo({ materialRcvdDate: '', billNo: '', vendorBillNo: '', billDate: '' });
    }
  }, [initialData]);

  useEffect(() => {
    let gross = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const newItems = items.map(item => {
      if (item.type && item.type !== 'item') return { ...item, netAmount: 0 };
      const rowGross = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
      const rowDiscount = rowGross * ((Number(item.discountPercent) || 0) / 100);
      const rowAddDiscount = rowGross * ((Number(item.addDiscount) || 0) / 100);
      const afterDiscount = rowGross - rowDiscount - rowAddDiscount;
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
    setItems(prev => prev.map(item => {
      if (item.id === id) return { ...item, [field]: value };
      return item;
    }));
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
        if (prev[prev.length - 1].id === rowId) {
          newItems.push(getEmptyItem('item'));
        }
        return newItems;
      });
    }
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
  const removeItemLine = (id) => {
    if (items.length > 1) setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCatalogSubmit = (cartItems) => {
    const newLines = cartItems.map(ci => ({
      ...getEmptyItem('item'),
      itemCode: ci.ItemCode || ci.code,
      description: ci.ItemName || ci.name || '',
      quantity: ci.selectedQty || 1,
      unitPrice: Number(ci.MRP || ci.price || 0)
    }));
    setItems(prev => {
      const filtered = prev.filter(i => i.itemCode !== '');
      return [...filtered, ...newLines, getEmptyItem('item')];
    });
    toast.success(`${cartItems.length} item(s) added from Catalog!`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!basicInfo.vendor) {
      toast.error('Vendor name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        docNo: initialData && initialData.docNo ? initialData.docNo : `PR-${Math.floor(1000 + Math.random() * 9000)}`,
        docDate: initialData && initialData.docDate ? initialData.docDate : new Date().toISOString().split('T')[0],
        vendor: basicInfo.vendor,
        vendorName: basicInfo.vendor,
        state: basicInfo.state || '',
        mobile: basicInfo.mobile || '',
        referenceNumber: otherInfo.referenceNumber || '',
        referenceDate: otherInfo.expectedDeliveryDate || '',
        amount: summary.totalAmount,
        status: purchaseStatus,
        supplyStatus: supplyStatus,
        billNo: headerInfo.billNo,
        billDate: headerInfo.billDate,
        details: { headerInfo, basicInfo, items, otherInfo, notes, summary }
      };
      let saved;
      if (initialData && initialData.id && !isConversion) {
        saved = await updatePurchase(initialData.id, data);
      } else {
        saved = await createPurchase(data);
      }
      onSave(saved);
    } catch (error) {
      toast.error('Failed to save purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title={initialData && initialData.id && !isConversion ? "Edit Purchase" : (isConversion ? "New Purchase (From PO)" : "New Purchase")}
      onSubmit={handleSubmit}
      submitText={isSubmitting ? 'Saving...' : (initialData && initialData.id && !isConversion ? 'Update Purchase' : 'Save Purchase')}
      maxWidth="max-w-[98vw] w-[98vw]"
    >
      <div className="space-y-6">
        
        {/* Header Actions (Print Preview, Post) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-3 md:p-2 rounded-lg border border-slate-100 gap-3 md:gap-0">
          <div className="flex flex-wrap md:flex-nowrap gap-3 md:gap-4 items-center w-full md:w-auto">
            <button type="button" onClick={() => setIsPrintPreviewOpen(true)} className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 w-full md:w-auto mb-2 md:mb-0"><Printer size={14} /> Print Preview</button>
            <div className="hidden md:block text-slate-300">|</div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-2 w-[45%] md:w-auto">
              <span className="text-[10px] md:text-xs font-bold text-slate-700 uppercase md:normal-case">Mat.Rcvd.Dt</span>
              <input type="date" value={headerInfo.materialRcvdDate} onChange={e => setHeaderInfo({...headerInfo, materialRcvdDate: e.target.value})} className="px-2 py-1.5 md:py-1 border border-slate-200 rounded text-xs outline-none w-full md:w-auto" />
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-2 w-[45%] md:w-auto">
              <span className="text-[10px] md:text-xs font-bold text-slate-700 uppercase md:normal-case">Bill #</span>
              <input type="text" value={headerInfo.billNo} onChange={e => setHeaderInfo({...headerInfo, billNo: e.target.value})} className="px-2 py-1.5 md:py-1 border border-slate-200 rounded text-xs outline-none w-full md:w-24" placeholder="Bill No" />
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-2 w-[45%] md:w-auto">
              <span className="text-[10px] md:text-xs font-bold text-slate-700 uppercase md:normal-case">Bill Date</span>
              <input type="date" value={headerInfo.billDate} onChange={e => setHeaderInfo({...headerInfo, billDate: e.target.value})} className="px-2 py-1.5 md:py-1 border border-slate-200 rounded text-xs outline-none w-full md:w-auto" />
            </div>
          </div>

        </div>

        <VendorDetailsSection 
          basicInfo={basicInfo} 
          setBasicInfo={setBasicInfo} 
          onOpenVendorModal={() => {
            setEditingVendor(null);
            setIsVendorModalOpen(true);
          }} 
          onEditVendor={(vendor) => {
            setEditingVendor(vendor);
            setIsVendorModalOpen(true);
          }}
        />

        <div className="min-h-[250px] py-4">
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
          />
          <SummaryCard 
            summary={summary} 
            onFinalAmountChange={(val) => setSummary(prev => ({ ...prev, finalAmount: val }))} 
          />
        </div>


      </div>
    </ModalForm>
    <CatalogModal isOpen={isCatalogOpen} onClose={() => setIsCatalogOpen(false)} onSubmitCart={handleCatalogSubmit} />
    <NewVendorModal
      isOpen={isVendorModalOpen}
      onClose={() => setIsVendorModalOpen(false)}
      initialData={editingVendor}
      onSave={(vendor) => {
        setBasicInfo(prev => ({ ...prev, vendor: vendor.vendorName }));
        toast.success(`Vendor "${vendor.vendorName}" saved!`);
      }}
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
              
              #purchase-print-area, #purchase-print-area * {
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
              #purchase-print-area {
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
        
        <div className={`w-full mx-auto flex flex-col flex-1 min-h-0 mt-10 shadow-2xl rounded-2xl ${
          printOrientation === 'Horizontal' ? 'max-w-4xl' : 'max-w-3xl'
        }`}>
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
                onClick={() => window.print()}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition shadow-sm"
              >
                Print / Save PDF
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
          
          <div className="flex-1 w-full overflow-y-auto min-h-0 rounded-b-2xl" id="purchase-print-area">
            <PremiumPurchasePrint
              initialData={initialData}
              basicInfo={basicInfo}
              otherInfo={otherInfo}
              items={items}
              summary={summary}
              notes={notes}
              inventoryItems={inventoryItems}
              headerInfo={headerInfo}
              documentTitle="Purchase"
            />
          </div>
        </div>
      </div>,
      document.getElementById('erp-main-container') || document.body
    )}
    </>
  );
}
