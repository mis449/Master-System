import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, FileText, Image as ImageIcon, Copy, Box, Move, Tag } from 'lucide-react';

import toast from 'react-hot-toast';
import useDataStore from '../../store/dataStore';
import AddProductModal from '../AddProductModal';

export default function ItemLinesTable({
  items,
  inventoryItems,
  handleItemChange,
  handleItemCodeSelect,
  removeItemLine,
  addItemLine,
  addSection,
  addSubSection,
  copySection,
  setIsCatalogOpen,
  reorderItemLines,
  showStatus = false,
  showUploadAndRemark = false,
  openBrandDiscount
}) {
  const updateItemPrice = useDataStore(state => state.updateItemPrice);
  const updateItemImage = useDataStore(state => state.updateItemImage);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [searchTerms, setSearchTerms] = useState({});
  const dropdownRefs = useRef({});

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragEnter = (e, index) => {
    if (!reorderItemLines || draggedIndex === null || draggedIndex === index) return;
    reorderItemLines(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Close dropdown on outside click
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

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="sticky top-0 z-30 flex flex-wrap gap-2 mb-2 bg-white/95 backdrop-blur-sm py-2 md:py-3 -mt-2 -mx-2 px-2 border-b border-slate-100 shadow-sm rounded-t-lg">
         <button type="button" onClick={addItemLine} className="text-xs font-bold bg-sky-50 text-sky-600 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-sky-100 shadow-sm"><Plus size={14}/> Add Item Line</button>
         <button type="button" onClick={addSection} className="text-xs font-bold bg-white text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-50 border border-slate-200 shadow-sm"><Plus size={14}/> Add Section</button>
         <button type="button" onClick={addSubSection} className="text-xs font-bold bg-white text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-50 border border-slate-200 shadow-sm"><Plus size={14}/> Add Sub-Section</button>
         <button type="button" onClick={() => setIsCatalogOpen(true)} className="text-xs font-bold bg-white text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-50 border border-slate-200 shadow-sm"><FileText size={14}/> Catalog</button>
         <button type="button" onClick={() => setIsAddProductOpen(true)} className="text-xs font-bold bg-sky-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-sky-700 shadow-sm"><Box size={14}/> Add Product</button>
         {openBrandDiscount && (
           <button type="button" onClick={openBrandDiscount} className="text-xs font-bold bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-purple-100 border border-purple-100 shadow-sm ml-auto"><Tag size={14}/> Brand Discount</button>
         )}
      </div>

      {/* Header */}
      <div className={`hidden md:grid gap-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center bg-slate-50 py-2 rounded-lg ${showStatus ? 'grid-cols-[repeat(16,minmax(0,1fr))]' : showUploadAndRemark ? 'grid-cols-[repeat(16,minmax(0,1fr))]' : 'grid-cols-[repeat(14,minmax(0,1fr))]'}`}>
        <div className="col-span-3 text-left">Item Code</div>
        <div className="col-span-1 text-center">Image</div>
        {showStatus ? (
          <>
            <div className="col-span-2 text-left">Description</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-1">Act Disp</div>
            <div className="col-span-1">Rem Qty</div>
            <div className="col-span-1">Unit Price</div>
            <div className="col-span-1">Disc %</div>
            <div className="col-span-1 text-right">Tax %</div>
            <div className="col-span-1 text-right">Net Amt</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-1">Action</div>
          </>
        ) : showUploadAndRemark ? (
          <>
            <div className="col-span-2 text-left">Description</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-1">Unit Price</div>
            <div className="col-span-1">Disc %</div>
            <div className="col-span-1">Tax %</div>
            <div className="col-span-1 text-right">Net Amt</div>
            <div className="col-span-2 text-center">Remark</div>
            <div className="col-span-2 text-center">Upload Image</div>
            <div className="col-span-1">Action</div>
          </>
        ) : (
          <>
            <div className="col-span-3 text-left">Description</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-2">Unit Price</div>
            <div className="col-span-1">Disc %</div>
            <div className="col-span-1">Tax %</div>
            <div className="col-span-1 text-right">Net Amt</div>
            <div className="col-span-1">Action</div>
          </>
        )}
      </div>

      {items.map((item, index) => {
        if (item.type === 'section' || item.type === 'subsection') {
          const isSub = item.type === 'subsection';
          return (
            <div 
              key={item.id} 
              draggable={!!reorderItemLines}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 p-2 md:px-2 md:py-3 rounded-xl md:rounded-none md:border-b shadow-sm md:shadow-none bg-white border border-slate-100 ${isSub ? 'ml-4 border-l-2 border-l-slate-300' : 'border-l-4 border-l-sky-500 bg-sky-50/40'} ${draggedIndex === index ? 'opacity-50' : ''}`}
            >
              {reorderItemLines && (
                <div className="cursor-grab hover:text-sky-600 text-slate-400">
                  <Move size={16} />
                </div>
              )}
              <div className="flex-1 pl-2">
                <input type="text" value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className={`w-full bg-transparent outline-none font-bold placeholder-slate-400 ${isSub ? 'text-slate-600 text-xs' : 'text-sky-800 text-sm'}`} placeholder={isSub ? "Enter Sub-Section Title..." : "Enter Section Title..."} />
              </div>
              {copySection && (
                <button type="button" onClick={() => copySection(item.id)} className="p-1.5 text-sky-500 hover:text-sky-700 hover:bg-sky-100 rounded transition-colors" title="Duplicate">
                  <Copy size={14} />
                </button>
              )}
              <button type="button" onClick={() => removeItemLine(item.id)} className="p-1.5 text-red-400 hover:text-red-650 hover:bg-red-50 rounded transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          );
        }

        const rowGross = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
        const rowDiscount = rowGross * ((Number(item.discountPercent) || 0) / 100);
        const afterDiscount = rowGross - rowDiscount;
        const rowTax = afterDiscount * ((Number(item.taxPercent) || 0) / 100);
        const net = afterDiscount + rowTax;

        const isCompleted = Number(item.dispatchedQty || 0) >= Number(item.quantity || 0) && Number(item.quantity || 0) > 0;
        const ordered = Number(item.quantity || 0);
        const dispatched = Number(item.dispatchedQty || 0);
        const remaining = Math.max(0, ordered - dispatched);

        const matchedInventoryItem = inventoryItems?.find(i => (i.ItemCode || i.code) === item.itemCode);
        const defaultImageUrl = matchedInventoryItem ? (matchedInventoryItem.Thumbnail || matchedInventoryItem.product_image_url) : '';
        const imageUrl = item.thumbnail !== undefined ? item.thumbnail : defaultImageUrl;

        return (
          <div 
            key={item.id} 
            draggable={!!reorderItemLines}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            className={`grid gap-3 md:gap-2 items-center bg-white border border-slate-100 md:border-b p-4 md:p-2 rounded-xl md:rounded-none shadow-sm md:shadow-none grid-cols-2 ${showStatus ? 'md:grid-cols-[repeat(16,minmax(0,1fr))]' : showUploadAndRemark ? 'md:grid-cols-[repeat(16,minmax(0,1fr))]' : 'md:grid-cols-[repeat(14,minmax(0,1fr))]'} ${draggedIndex === index ? 'opacity-50' : ''}`}
          >
            <div className="col-span-2 md:col-span-3 space-y-1">
              <div className="md:hidden text-[10px] font-bold text-slate-500 uppercase">Item Code</div>
              <div className="flex gap-1 items-center">
                {reorderItemLines && (
                  <div className="cursor-grab hover:text-sky-600 text-slate-400 hidden md:block">
                    <Move size={16} />
                  </div>
                )}
                <div className="flex-1 min-w-0 relative" ref={el => dropdownRefs.current[item.id] = el}>
                  <input
                    type="text"
                    value={activeDropdownId === item.id ? (searchTerms[item.id] ?? item.itemCode ?? '') : (item.itemCode || '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchTerms(prev => ({...prev, [item.id]: val}));
                      handleItemChange(item.id, 'itemCode', val);
                      setActiveDropdownId(item.id);
                      const match = inventoryItems.find(i => (i.ItemCode || i.code) === val);
                      if (match) {
                        handleItemCodeSelect(val, item.id);
                        setTimeout(() => document.getElementById(`qty-${item.id}`)?.focus(), 10);
                      }
                    }}
                    onFocus={() => {
                      setActiveDropdownId(item.id);
                      setSearchTerms(prev => ({...prev, [item.id]: item.itemCode || ''}));
                    }}
                    className="w-full border border-slate-200 text-xs px-2 py-1.5 rounded outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 transition-all"
                    placeholder="Search Code..."
                    autoComplete="off"
                  />
                  {activeDropdownId === item.id && (() => {
                    const term = (searchTerms[item.id] ?? '').toLowerCase();
                    const filtered = inventoryItems.filter(i => {
                      const code = (i.ItemCode || i.code || '').toLowerCase();
                      const name = (i.ItemName || i.name || '').toLowerCase();
                      return code.includes(term) || name.includes(term);
                    }).slice(0, 30);
                    if (filtered.length === 0) return null;
                    return (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-[200] overflow-hidden" style={{animation: 'fadeInDown 0.15s ease-out'}}>
                        <div className="max-h-56 overflow-y-auto">
                          {filtered.map((inv) => {
                            const code = inv.ItemCode || inv.code;
                            const name = inv.ItemName || inv.name;
                            const isSelected = item.itemCode === code;
                            return (
                              <div
                                key={code}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleItemCodeSelect(code, item.id);
                                  handleItemChange(item.id, 'itemCode', code);
                                  setActiveDropdownId(null);
                                  setSearchTerms(prev => ({...prev, [item.id]: code}));
                                  setTimeout(() => document.getElementById(`qty-${item.id}`)?.focus(), 10);
                                }}
                                className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors border-b border-slate-50 last:border-0 ${
                                  isSelected ? 'bg-sky-50' : 'hover:bg-slate-50'
                                }`}
                              >
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide flex-shrink-0 ${
                                  isSelected ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>{code}</span>
                                <span className="text-xs text-slate-600 truncate">{name}</span>
                                {isSelected && <span className="ml-auto text-sky-600 text-xs">✓</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                {item.itemCode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(item.itemCode);
                      toast.success('Item code copied!');
                    }}
                    title="Copy Item Code"
                    className="flex-shrink-0 w-[30px] h-[30px] flex items-center justify-center bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 text-slate-500 hover:text-sky-600 transition-colors"
                  >
                    <Copy size={14} />
                  </button>
                )}
              </div>
            </div>

            <div 
              className="col-span-1 md:col-span-1 flex flex-col items-center justify-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity"
              title="Click to update image URL"
              onClick={() => {
                if (!item.itemCode) return;
                const newUrl = prompt("Enter new Image URL for " + item.itemCode + " (leave empty to remove):", imageUrl);
                if (newUrl !== null) {
                  handleItemChange(item.id, 'thumbnail', newUrl.trim());
                  updateItemImage(item.itemCode, newUrl.trim());
                }
              }}
            >
              <div className="md:hidden text-[10px] font-bold text-slate-500 uppercase w-full text-center">Image</div>
              {imageUrl ? (
                <img src={imageUrl} alt="product" className="w-12 h-12 rounded object-cover border border-slate-200 bg-slate-50" />
              ) : (
                <div className="w-12 h-12 rounded bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                  <ImageIcon size={20} />
                </div>
              )}
            </div>

            <div className={`col-span-2 ${showStatus ? 'md:col-span-2' : showUploadAndRemark ? 'md:col-span-2' : 'md:col-span-3'} space-y-1`}>
              <div className="md:hidden text-[10px] font-bold text-slate-500 uppercase">Description</div>
              <input type="text" value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className="w-full border border-slate-200 text-xs px-2 py-1.5 rounded outline-none" placeholder="Description" />
            </div>
            
            <div className="col-span-1 md:col-span-1 space-y-1 text-center md:text-center">
              <div className="md:hidden text-[10px] font-bold text-slate-500 uppercase">Qty</div>
              <input id={`qty-${item.id}`} type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} className="w-full border border-sky-200 text-sky-700 font-bold text-xs px-2 py-1.5 rounded outline-none text-center" />
            </div>

            {/* Act Disp and Rem Qty Columns */}
            {showStatus && (
              <>
                <div className="col-span-1 md:col-span-1 space-y-1 text-center md:text-center">
                  <div className="md:hidden text-[10px] font-bold text-slate-500 uppercase">Act Disp</div>
                  <div className="w-full bg-slate-50 border border-slate-200 text-xs px-1 py-1 rounded text-center text-sky-700 font-bold select-none">{dispatched}</div>
                </div>
                <div className="col-span-1 md:col-span-1 space-y-1 text-center md:text-center">
                  <div className="md:hidden text-[10px] font-bold text-slate-500 uppercase">Rem Qty</div>
                  <div className="w-full bg-slate-50 border border-slate-200 text-xs px-1 py-1 rounded text-center text-amber-600 font-bold select-none">{remaining}</div>
                </div>
              </>
            )}

            <div className={`col-span-1 ${showStatus ? 'md:col-span-1' : showUploadAndRemark ? 'md:col-span-1' : 'md:col-span-2'} space-y-1 text-center md:text-center`}>
              <div className="md:hidden text-[10px] font-bold text-slate-500 uppercase">Unit Price</div>
              <input 
                type="number" 
                value={item.unitPrice} 
                onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)} 
                onBlur={(e) => { if (item.itemCode && e.target.value) updateItemPrice(item.itemCode, e.target.value); }}
                className="w-full border border-slate-200 text-xs px-2 py-1.5 rounded outline-none text-center" 
              />
            </div>
            <div className="col-span-1 md:col-span-1 space-y-1 text-center md:text-center">
              <div className="md:hidden text-[10px] font-bold text-slate-500 uppercase">Disc %</div>
              <input type="number" value={item.discountPercent} onChange={(e) => handleItemChange(item.id, 'discountPercent', e.target.value)} className="w-full border border-slate-200 text-xs px-2 py-1.5 rounded outline-none text-center" />
            </div>
            <div className="col-span-1 md:col-span-1 space-y-1 text-center md:text-center">
              <div className="md:hidden text-[10px] font-bold text-slate-500 uppercase">Tax %</div>
              <input type="number" value={item.taxPercent} onChange={(e) => handleItemChange(item.id, 'taxPercent', e.target.value)} className="w-full border border-slate-200 text-xs px-2 py-1.5 rounded outline-none text-center" />
            </div>
            <div className="col-span-1 md:col-span-1 text-left md:text-right font-bold text-emerald-600 text-xs md:pr-1 pt-1 md:pt-0">
              <div className="md:hidden text-[10px] font-bold text-slate-500 uppercase">Net Amount</div>
              <div className="flex items-center justify-end">
                <span className="mr-1">₹</span>
                <input 
                  type="number" 
                  value={net ? Number(net).toFixed(2) : ''} 
                  onChange={(e) => {
                    const val = e.target.value;
                    const qty = Number(item.quantity) || 1;
                    const disc = (Number(item.discountPercent) || 0) / 100;
                    const tax = (Number(item.taxPercent) || 0) / 100;
                    const netVal = Number(val) || 0;
                    const denom = qty * (1 - disc) * (1 + tax);
                    const newUnitPrice = denom !== 0 ? netVal / denom : 0;
                    handleItemChange(item.id, 'unitPrice', Number(newUnitPrice).toFixed(4));
                  }} 
                  onBlur={(e) => { 
                    const qty = Number(item.quantity) || 1;
                    const disc = (Number(item.discountPercent) || 0) / 100;
                    const tax = (Number(item.taxPercent) || 0) / 100;
                    const netVal = Number(e.target.value) || 0;
                    const denom = qty * (1 - disc) * (1 + tax);
                    const newUnitPrice = denom !== 0 ? netVal / denom : 0;
                    if (item.itemCode && newUnitPrice) updateItemPrice(item.itemCode, newUnitPrice); 
                  }}
                  className="w-full max-w-[110px] border border-emerald-200 text-xs px-2 py-1.5 rounded outline-none text-right font-bold text-emerald-700 bg-emerald-50 focus:bg-white focus:border-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                  placeholder="0.00"
                />
              </div>
            </div>
            
            {showUploadAndRemark && (
              <>
                <div className="col-span-2 md:col-span-2 space-y-1 text-center md:text-center">
                  <div className="md:hidden text-[10px] font-bold text-slate-500 uppercase">Remark</div>
                  <input type="text" value={item.remark || ''} onChange={(e) => handleItemChange(item.id, 'remark', e.target.value)} className="w-full border border-slate-200 text-xs px-2 py-1.5 rounded outline-none h-[30px]" placeholder="Remark" />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-1 text-center md:text-center">
                  <div className="md:hidden text-[10px] font-bold text-slate-500 uppercase">Upload Image</div>
                  <label className="flex items-center justify-center cursor-pointer w-full border border-slate-200 text-[10px] px-2 rounded outline-none h-[30px] bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold transition-colors">
                    <span className="truncate">{item.image ? item.image.name : 'Upload Image'}</span>
                    <input type="file" accept="image/*" onChange={(e) => handleItemChange(item.id, 'image', e.target.files[0])} className="hidden" />
                  </label>
                </div>
              </>
            )}
            
            {/* Status Column */}
            {showStatus && (
              <div className="col-span-1 md:col-span-2 space-y-1 text-left md:text-center flex flex-col items-start md:items-center justify-center pt-1 md:pt-0">
                <div className="md:hidden text-[10px] font-bold text-slate-500 uppercase">Status</div>
                {isCompleted ? (
                  <span className="px-1.5 py-0.5 rounded text-[8px] uppercase font-black bg-emerald-100 text-emerald-700 border border-emerald-250">
                    Completed
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[8px] uppercase font-black bg-amber-100 text-amber-700 border border-amber-250">
                    Pending
                  </span>
                )}
              </div>
            )}

            <div className="col-span-2 md:col-span-1 flex justify-end md:justify-center pt-2 md:pt-0 border-t border-slate-100 md:border-0 mt-2 md:mt-0">
              <button type="button" onClick={() => removeItemLine(item.id)} disabled={items.length === 1} className="p-1.5 text-red-400 hover:text-red-650 hover:bg-red-50 rounded transition-colors disabled:opacity-30">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
      {/* Add Product Modal */}
      <AddProductModal isOpen={isAddProductOpen} onClose={() => setIsAddProductOpen(false)} />
    </div>
  );
}
