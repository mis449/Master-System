import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Printer, Eye, Download, Trash2, ChevronDown } from 'lucide-react';
import { createChallan, updateChallan } from '../../services/ChallanService';
import { getInvoicesByChallanId } from '../../services/InvoiceService';
import useDataStore from '../../store/dataStore';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

export default function ChallanFormModal({ isOpen, onClose, initialData, onSave, defaultToPreview = false, autoDownload = false }) {
  const { items: inventoryItems, fetchItems } = useDataStore();
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const dropdownRefs = useRef({});

  const [formData, setFormData] = useState({
    challan_no: `CH-${Math.floor(1000 + Math.random() * 9000)}`,
    challan_date: new Date().toISOString().split('T')[0],
    customer_name: '',
    address: '',
    gstin: '',
    order_no: '',
    order_date: '',
    through: '',
    pipe: '',
    box: '',
    bag: '',
    bdls: '',
    total: '',
    status: 'Active',
    items: [{ id: Date.now(), description: '', quantity: 1, unit: 'Nos' }]
  });
  
  const [isPreview, setIsPreview] = useState(defaultToPreview);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const printRef = useRef(null);
  const autoDownloadDone = useRef(false);

  useEffect(() => {
    if (isOpen) {
      fetchItems();
    } else {
      // Re-arm for the next open, and reset the view to whatever the caller asked for.
      autoDownloadDone.current = false;
      setIsPreview(defaultToPreview);
    }
  }, [isOpen, fetchItems, defaultToPreview]);

  // "Download PDF" straight from the challan list: render the same print layout
  // this modal already uses, generate the file, then close. Reusing it avoids a
  // second PDF implementation that could drift from the on-screen challan.
  useEffect(() => {
    if (!isOpen || !autoDownload || autoDownloadDone.current) return;
    if (!isPreview || !printRef.current) return;

    autoDownloadDone.current = true;
    let cancelled = false;
    // One frame so the print layout is laid out before it is rasterised.
    const timer = setTimeout(async () => {
      await handleDownloadPDF();
      if (!cancelled && onClose) onClose();
    }, 250);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [isOpen, autoDownload, isPreview, formData.challan_no]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeDropdownId !== null) {
        const ref = dropdownRefs.current[activeDropdownId];
        if (ref && !ref.contains(e.target)) {
          setActiveDropdownId(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdownId]);

  useEffect(() => {
    const initForm = async () => {
      if (initialData) {
        let items = initialData.items?.length > 0 ? [...initialData.items] : [{ id: Date.now(), description: '', quantity: 1, unit: 'Nos' }];
        
        // Match challan ID in invoice table and set QTY = orderedQty - dispatchedQty
        if (initialData.id && !defaultToPreview) {
          try {
            const invoices = await getInvoicesByChallanId(initialData.id);
            if (invoices && invoices.length > 0) {
              const invoice = invoices[0];
              items = items.map(item => {
                const invItem = invoice.items?.find(i => 
                  (i.itemCode && item.itemCode && i.itemCode === item.itemCode) || 
                  (i.id && item.id && String(i.id) === String(item.id))
                );
                if (invItem) {
                  const ordered = Number(invItem.orderedQty !== undefined ? invItem.orderedQty : (invItem.quantity || 0));
                  const dispatched = Number(invItem.dispatchedQty || 0);
                  const pending = Math.max(0, ordered - dispatched);
                  return { ...item, quantity: pending };
                }
                return item;
              });
            }
          } catch (error) {
            console.error("Error fetching linked invoice:", error);
          }
        }
        
        setFormData({
          ...initialData,
          items
        });
      }
    };
    
    initForm();
  }, [initialData, defaultToPreview]);

  if (!isOpen) return null;

  const handleItemChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleSelectItem = (rowId, selectedItem) => {
    const desc = selectedItem.ItemName || selectedItem.description || selectedItem.name || '';
    const code = selectedItem.ItemCode || selectedItem.code || '';
    const rate = selectedItem.MRP || selectedItem.price || selectedItem.ItmQtyRate || 0;

    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === rowId ? {
        ...item,
        description: code ? `${code} - ${desc}` : desc,
        itemCode: code,
        rate: rate || item.rate || ''
      } : item)
    }));
    setActiveDropdownId(null);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now(), description: '', quantity: 1, unit: 'Nos' }]
    }));
  };

  const removeItem = (id) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleSave = async () => {
    if (!formData.customer_name) {
      toast.error('Customer Name is required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      let saved;
      const dataToSave = { ...formData };
      // Not a challan column; the link to the order is kept in order_no.
      delete dataToSave.quotation_id;
      delete dataToSave.id;
      delete dataToSave.created_at;
      delete dataToSave.updated_at;

      if (initialData && initialData.id) {
        saved = await updateChallan(initialData.id, dataToSave);
      } else {
        saved = await createChallan(dataToSave);
        // Raising a challan no longer changes the order status. Nothing is
        // invoiced yet, so the order stays in Confirmed until an invoice exists.
      }
      onSave(saved);
    } catch (error) {
      toast.error('Failed to save challan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    
    try {
      toast.loading('Generating PDF...', { id: 'pdf-toast' });
      const imgData = await toJpeg(printRef.current, { 
        quality: 1.0, 
        pixelRatio: 2,
        skipFonts: true // Prevents SecurityError on cross-origin CSS fonts
      });
      
      const elemWidth = printRef.current.offsetWidth;
      const elemHeight = printRef.current.scrollHeight; // Use scrollHeight to get full content height
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (elemHeight * pdfWidth) / elemWidth;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, Math.max(297, pdfHeight)] // Ensure minimum A4 height, but expand if content is taller
      });
      
      // Page 1: Copy 1
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      // Page 2: Copy 2
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      // Download 1st PDF (Original Copy)
      pdf.save(`Challan_${formData.challan_no}_Original.pdf`);

      // Download 2nd PDF (Duplicate Copy)
      setTimeout(() => {
        pdf.save(`Challan_${formData.challan_no}_Duplicate.pdf`);
      }, 300);

      toast.success('2 PDF Copies Downloaded!', { id: 'pdf-toast' });
    } catch (err) {
      console.error('PDF Error:', err);
      toast.error('Failed to generate PDF: ' + (err.message || 'Unknown error'), { id: 'pdf-toast' });
    }
  };

  const printPreviewContent = (
    <div className="bg-white mx-auto shadow-xl font-sans text-black flex flex-col shrink-0 p-4 pb-2" style={{ width: '210mm', minHeight: '297mm', minWidth: '794px' }} ref={printRef}>
      
      {/* Header */}
      <div className="flex justify-between items-start text-xs font-bold mb-1 px-2">
        <div className="tracking-wide">GSTIN : 22AAKFP3460D1ZL</div>
        <div className="text-xl font-black uppercase tracking-widest border-b-2 border-black px-4">CHALLAN</div>
        <div className="text-right leading-tight tracking-wide">
          H.O : 4700501<br/>
          B.O : 4900603
        </div>
      </div>

      <div className="text-center mt-3 mb-3">
        <h1 className="text-[34px] leading-none font-black tracking-widest font-serif" style={{ transform: 'scaleY(1.15)' }}>PAREKH SANITARY STORES</h1>
        <div className="mt-3 text-xs font-bold leading-tight">
          <p>H.O. : C-1,3 & 4, Rishabh Complex, M.G. Road, Raipur (C.G.)</p>
          <p>B.O. : Opp. Colours Mall, Pachpedi Naka, Raipur (C.G.)</p>
        </div>
      </div>

      <div className="flex items-center text-xs font-bold mb-4 pb-2 px-2 border-b-[2.5px] border-black">
        <span className="mr-3 tracking-wide">Distributer :</span>
        <div className="flex-1 text-[13px] tracking-wide" style={{ wordSpacing: '5px' }}>
          TOTO LAUFEN Roca Parryware DELTA GEBERIT viega FRANKE Jayna GROHE <span className="text-[10px]">AO Smith</span>
        </div>
      </div>

      {/* Main Box */}
      <div className="border-[2.5px] border-black flex-1 flex flex-col -mt-2">
        
        {/* Form Details */}
        <div className="p-3 pb-2 text-sm font-bold flex flex-col gap-4">
          {/* Row 1 */}
          <div className="flex justify-between items-end">
            <div className="flex w-1/2 items-end">
              <span className="mr-2 pb-1">No. PG/</span>
              <span className="flex-1 border-b-[1.5px] border-black text-red-600 font-normal px-2 text-xl leading-none text-center pb-1 font-serif italic">{formData.challan_no}</span>
            </div>
            <div className="flex w-1/3 items-end">
              <span className="mr-2 pb-1">Date</span>
              <span className="flex-1 border-b-[1.5px] border-black font-normal px-2 text-lg leading-none text-center pb-1">{formData.challan_date}</span>
            </div>
          </div>
          
          {/* Row 2 */}
          <div className="flex items-end">
            <span className="mr-2 pb-1">M/s.</span>
            <span className="flex-1 border-b-[1.5px] border-black font-normal px-2 text-xl leading-none pb-1">{formData.customer_name}</span>
          </div>
          
          {/* Row 3 (Address) */}
          <div className="flex items-end">
            <span className="flex-1 border-b-[1.5px] border-black font-normal px-2 text-xl leading-none pb-1 min-h-[28px] text-right pr-8">{formData.address}</span>
          </div>

          {/* Row 4 */}
          <div className="flex justify-between items-end mt-1">
            <div className="flex flex-1 items-end">
              <span className="mr-2 pb-0.5">Order No.</span>
              <span className="flex-1 border-b-[1.5px] border-black font-normal px-2 leading-none pb-0.5 text-center">{formData.order_no || '\u00A0'}</span>
            </div>
            <div className="flex flex-1 mx-2 items-end">
              <span className="mr-2 pb-0.5">Date</span>
              <span className="flex-1 border-b-[1.5px] border-black font-normal px-2 leading-none pb-0.5 text-center">{formData.order_date || '\u00A0'}</span>
            </div>
            <div className="flex flex-[1.2] items-end">
              <span className="mr-2 pb-0.5">Through</span>
              <span className="flex-1 border-b-[1.5px] border-black font-normal px-2 leading-none pb-0.5 text-center text-lg">{formData.through || '\u00A0'}</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 border-t-[2.5px] border-black flex flex-col">
          <div className="flex border-b-[2.5px] border-black text-sm font-bold text-center">
            <div className="w-[12%] border-r-[2.5px] border-black py-1">Qty.</div>
            <div className="flex-1 border-r-[2.5px] border-black py-1">Descriptions Of Material</div>
            <div className="w-[15%] border-r-[2.5px] border-black py-1">Rate</div>
            <div className="w-[18%] py-1">Amount</div>
          </div>
          
          <div className="flex-1 flex flex-col">
            {formData.items.map((item, idx) => (
              <div key={item.id} className="flex border-b-[1.5px] border-black text-lg min-h-[36px]">
                <div className="w-[12%] border-r-[2.5px] border-black px-2 py-1 text-center font-bold">{item.quantity}</div>
                <div className="flex-1 border-r-[2.5px] border-black px-3 py-1 font-bold">{item.description || (item.itemCode ? `${item.itemCode} - ${item.description}` : '')}</div>
                <div className="w-[15%] border-r-[2.5px] border-black px-2 py-1 text-center font-bold">{item.rate || ''}</div>
                <div className="w-[18%] px-2 py-1 text-center font-bold">{(item.quantity * (item.rate || 0)) || ''}</div>
              </div>
            ))}
            {/* Fill empty rows (e.g. up to 12 total rows) */}
            {[...Array(Math.max(0, 14 - formData.items.length))].map((_, i) => (
              <div key={`empty-${i}`} className="flex border-b-[1.5px] border-black text-lg min-h-[36px]">
                <div className="w-[12%] border-r-[2.5px] border-black"></div>
                <div className="flex-1 border-r-[2.5px] border-black"></div>
                <div className="w-[15%] border-r-[2.5px] border-black"></div>
                <div className="w-[18%]"></div>
              </div>
            ))}
            {/* Remaining empty space to fill the flex-1 container */}
            <div className="flex flex-1 min-h-[36px]">
                <div className="w-[12%] border-r-[2.5px] border-black"></div>
                <div className="flex-1 border-r-[2.5px] border-black"></div>
                <div className="w-[15%] border-r-[2.5px] border-black"></div>
                <div className="w-[18%]"></div>
            </div>
          </div>
        </div>

        {/* Footer Summary */}
        <div className="border-t-[2.5px] border-black flex flex-col text-sm font-bold">
          <div className="flex p-2 border-b-[2.5px] border-black px-3 gap-6">
            <div className="flex items-center gap-2">Pipe <div className="w-16 h-6 border-[1.5px] border-black text-center font-bold text-lg leading-none">{formData.pipe}</div></div>
            <div className="flex items-center gap-2">Box <div className="w-16 h-6 border-[1.5px] border-black text-center font-bold text-lg leading-none">{formData.box}</div></div>
            <div className="flex items-center gap-2">Bag <div className="w-16 h-6 border-[1.5px] border-black text-center font-bold text-lg leading-none">{formData.bag}</div></div>
            <div className="flex items-center gap-2">Bdls. <div className="w-16 h-6 border-[1.5px] border-black text-center font-bold text-lg leading-none">{formData.bdls}</div></div>
            <div className="flex items-center gap-2 ml-auto">Total <div className="w-16 h-6 border-[1.5px] border-black text-center font-bold text-lg leading-none">{formData.total}</div></div>
          </div>

          <div className="p-3 px-4 flex justify-between items-end relative min-h-[90px]">
            <div className="text-xs">
              <div className="flex items-start gap-1 font-bold mb-1"><span className="text-lg leading-none mt-[-4px]">●</span> <span>Received the above item in good condition.</span></div>
              <div className="flex items-start gap-1 font-bold"><span className="text-lg leading-none mt-[-4px]">●</span> <span>Goods once sold will not be taken back. E.& O.E.</span></div>
              <div className="mt-8 ml-2">Customer's Signature</div>
            </div>
            <div className="text-right pb-1">
              <div className="font-bold text-[13px] tracking-wide">For, PAREKH SANITARY STORES</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white rounded-2xl overflow-hidden">
      <div className="w-full h-full flex flex-col overflow-hidden">
        
        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-50 p-4 md:p-6 pb-24 relative">
          {/* Floating Close Button */}
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-10 p-2 bg-white text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full shadow-sm border border-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
          {isPreview ? (
            <div className="w-full overflow-x-auto pb-8">
              <div className="w-fit mx-auto">
                {printPreviewContent}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-8">
                
                {/* Top Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Customer Name *</label>
                    <input type="text" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Address</label>
                    <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Challan Date</label>
                    <input type="date" value={formData.challan_date} onChange={e => setFormData({...formData, challan_date: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-emerald-500 outline-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Order Date</label>
                    <input type="date" value={formData.order_date || ''} onChange={e => setFormData({...formData, order_date: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-emerald-500 outline-none" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Through</label>
                    <input type="text" value={formData.through} onChange={e => setFormData({...formData, through: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-emerald-500 outline-none" placeholder="e.g. Courier, Transport Name" />
                  </div>
                </div>

                {/* Items Delivery */}
                <div>
                  <h3 className="text-sm font-bold text-emerald-800 mb-4 border-b pb-2">Items Delivery</h3>
                  <div className="space-y-3">
                    <div className="flex gap-3 items-center text-xs font-bold text-slate-500 uppercase px-1 mb-2 border-b pb-2">
                      <div className="w-10 text-center">SN</div>
                      <div className="flex-1">Description of Material</div>
                      <div className="w-20 text-center">Qty</div>
                      <div className="w-24 text-center">Rate</div>
                      <div className="w-28 text-center">Amount</div>
                      <div className="w-8"></div>
                    </div>
                    {formData.items.map((item, idx) => (
                      <div key={item.id} className="flex gap-3 items-start">
                        <div className="w-10 pt-2 text-center text-sm font-bold text-slate-400">{idx + 1}</div>
                        <div className="flex-1 relative" ref={el => dropdownRefs.current[item.id] = el}>
                          <div className="relative flex items-center">
                            <input 
                              type="text" 
                              placeholder="Description of material" 
                              value={item.description || (item.itemCode ? `${item.itemCode} - ${item.description}` : '')} 
                              onChange={e => {
                                handleItemChange(item.id, 'description', e.target.value);
                                setActiveDropdownId(item.id);
                              }} 
                              onFocus={() => setActiveDropdownId(item.id)}
                              className="w-full p-2 pr-8 border border-slate-300 rounded focus:border-emerald-500 outline-none text-sm" 
                            />
                            <ChevronDown size={16} className="absolute right-2 text-slate-400 pointer-events-none" />
                          </div>

                          {activeDropdownId === item.id && (() => {
                            const term = (item.description || '').toLowerCase();
                            const filtered = (inventoryItems || []).filter(inv => {
                              const code = (inv.ItemCode || inv.code || '').toLowerCase();
                              const name = (inv.ItemName || inv.name || inv.description || '').toLowerCase();
                              const brand = (inv.BrandName || inv.brand || '').toLowerCase();
                              return code.includes(term) || name.includes(term) || brand.includes(term);
                            }).slice(0, 100);

                            if (filtered.length === 0) return null;

                            return (
                              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-[200] max-h-60 overflow-y-auto">
                                {filtered.map((inv, iIdx) => {
                                  const code = inv.ItemCode || inv.code;
                                  const name = inv.ItemName || inv.name || inv.description;
                                  const brand = inv.BrandName || inv.brand;
                                  const price = inv.MRP || inv.price || inv.ItmQtyRate;

                                  return (
                                    <div
                                      key={inv.ItmID || inv.id || iIdx}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelectItem(item.id, inv);
                                      }}
                                      className="px-3 py-2 cursor-pointer hover:bg-emerald-50 border-b border-slate-100 last:border-0 flex justify-between items-center text-xs"
                                    >
                                      <div className="flex flex-col pr-2 min-w-0">
                                        <span className="font-bold text-slate-800 truncate">
                                          {code ? `${code} - ` : ''}{name}
                                        </span>
                                        {brand && (
                                          <span className="text-[10px] text-slate-500 truncate">
                                            Brand: {brand}
                                          </span>
                                        )}
                                      </div>
                                      {price > 0 && (
                                        <span className="font-semibold text-emerald-700 text-xs shrink-0 ml-2">
                                          ₹{price}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="w-20">
                          <input type="number" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:border-emerald-500 outline-none text-sm text-center" />
                        </div>
                        <div className="w-24">
                          <input type="number" placeholder="Rate" value={item.rate || ''} onChange={e => handleItemChange(item.id, 'rate', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:border-emerald-500 outline-none text-sm text-center" />
                        </div>
                        <div className="w-28">
                          <input type="number" placeholder="Amount" value={(item.quantity * (item.rate || 0)) || ''} readOnly className="w-full p-2 border border-slate-300 bg-slate-50 rounded focus:border-emerald-500 outline-none text-sm text-center font-semibold" />
                        </div>
                        <button onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    
                    <div className="pt-2">
                      <button 
                        onClick={addItem}
                        type="button"
                        className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg transition-colors"
                      >
                        + Add Item
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Summary Edit Boxes */}
                <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-700 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2"><span>Pipe</span> <input type="text" value={formData.pipe} onChange={e => setFormData({...formData, pipe: e.target.value})} className="w-16 p-1 border border-slate-300 rounded outline-none text-center focus:border-emerald-500" /></div>
                  <div className="flex items-center gap-2"><span>Box</span> <input type="text" value={formData.box} onChange={e => setFormData({...formData, box: e.target.value})} className="w-16 p-1 border border-slate-300 rounded outline-none text-center focus:border-emerald-500" /></div>
                  <div className="flex items-center gap-2"><span>Bag</span> <input type="text" value={formData.bag} onChange={e => setFormData({...formData, bag: e.target.value})} className="w-16 p-1 border border-slate-300 rounded outline-none text-center focus:border-emerald-500" /></div>
                  <div className="flex items-center gap-2"><span>Bdls.</span> <input type="text" value={formData.bdls} onChange={e => setFormData({...formData, bdls: e.target.value})} className="w-16 p-1 border border-slate-300 rounded outline-none text-center focus:border-emerald-500" /></div>
                  <div className="flex items-center gap-2 ml-auto"><span>Total</span> <input type="text" value={formData.total} onChange={e => setFormData({...formData, total: e.target.value})} className="w-20 p-1 border border-slate-300 bg-slate-50 rounded outline-none text-center focus:border-emerald-500" /></div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Footer (Sticky at Bottom) */}
        <div className="border-t border-slate-200 p-4 px-6 bg-white flex justify-end items-center gap-3">
          <button 
            onClick={() => setIsPreview(!isPreview)}
            className="px-4 py-2 bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
          >
            {isPreview ? 'Edit Form' : <><Eye size={16} /> Preview</>}
          </button>
          
          {isPreview ? (
            <button 
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm shadow-emerald-200"
            >
              <Download size={16} /> Download PDF
            </button>
          ) : (
            <button 
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm shadow-emerald-200"
            >
              <Save size={16} /> {isSubmitting ? 'Saving...' : 'Save Challan'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
