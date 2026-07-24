import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, FileText, Image as ImageIcon, Copy, Box, Move, Tag, Edit, X, Upload, Clipboard } from 'lucide-react';

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
  const inventorySummary = useDataStore(state => state.inventorySummary);
  const fetchInventorySummary = useDataStore(state => state.fetchInventorySummary);

  useEffect(() => {
    fetchInventorySummary();
  }, [fetchInventorySummary]);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [editingImageItem, setEditingImageItem] = useState(null);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [draggableItemId, setDraggableItemId] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [searchTerms, setSearchTerms] = useState({});
  const dropdownRefs = useRef({});

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (reorderItemLines && draggedIndex !== null && draggedIndex !== index) {
      reorderItemLines(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
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
         <button type="button" onClick={addItemLine} className="text-sm font-bold bg-sky-50 text-sky-600 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-sky-100 shadow-sm"><Plus size={14}/> Add Item Line</button>
         <button type="button" onClick={addSection} className="text-sm font-bold bg-white text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-50 border border-slate-200 shadow-sm"><Plus size={14}/> Add Section</button>
         <button type="button" onClick={addSubSection} className="text-sm font-bold bg-white text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-50 border border-slate-200 shadow-sm"><Plus size={14}/> Add Sub-Section</button>
         <button type="button" onClick={() => setIsCatalogOpen(true)} className="text-sm font-bold bg-white text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-50 border border-slate-200 shadow-sm"><FileText size={14}/> Catalog</button>
         <button type="button" onClick={() => { setProductToEdit(null); setIsAddProductOpen(true); }} className="text-sm font-bold bg-sky-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-sky-700 shadow-sm"><Box size={14}/> Add Product</button>
         {openBrandDiscount && (
           <button type="button" onClick={openBrandDiscount} className="text-sm font-bold bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-purple-100 border border-purple-100 shadow-sm ml-auto"><Tag size={14}/> Brand Discount</button>
         )}
      </div>

      {/* Header */}
      <div className={`hidden md:grid gap-2 px-2 text-sm md:text-sm font-bold text-slate-500 uppercase tracking-wider text-center bg-slate-50 py-2 rounded-lg ${showStatus ? 'grid-cols-[repeat(18,minmax(0,1fr))]' : showUploadAndRemark ? 'grid-cols-[repeat(18,minmax(0,1fr))]' : 'grid-cols-[repeat(16,minmax(0,1fr))]'}`}>
        <div className="col-span-3 text-left">Item Code</div>
        <div className="col-span-1 text-center">Image</div>
        {showStatus ? (
          <>
            <div className="col-span-2 text-left">Description</div>
            <div className="col-span-1 text-center">Stock</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-1">Act Disp</div>
            <div className="col-span-1">Rem Qty</div>
            <div className="col-span-1">Unit Price</div>
            <div className="col-span-1">Disc %</div>
            <div className="col-span-1">Add Disc %</div>
            <div className="col-span-1 text-right">Tax %</div>
            <div className="col-span-1 text-right">Net Amt</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-1">Action</div>
          </>
        ) : showUploadAndRemark ? (
          <>
            <div className="col-span-2 text-left">Description</div>
            <div className="col-span-1 text-center">Stock</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-1">Unit Price</div>
            <div className="col-span-1">Disc %</div>
            <div className="col-span-1">Add Disc %</div>
            <div className="col-span-1">Tax %</div>
            <div className="col-span-1 text-right">Net Amt</div>
            <div className="col-span-2 text-center">Remark</div>
            <div className="col-span-2 text-center">Upload Image</div>
            <div className="col-span-1">Action</div>
          </>
        ) : (
          <>
            <div className="col-span-3 text-left">Description</div>
            <div className="col-span-1 text-center">Stock</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-2">Unit Price</div>
            <div className="col-span-1">Disc %</div>
            <div className="col-span-1">Add Disc %</div>
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
              draggable={reorderItemLines && draggableItemId === item.id}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 p-2 md:px-2 md:py-3 rounded-xl md:rounded-none md:border-b shadow-sm md:shadow-none bg-white border border-slate-100 ${isSub ? 'ml-4 border-l-2 border-l-slate-300' : 'border-l-4 border-l-sky-500 bg-sky-50/40'} ${draggedIndex === index ? 'opacity-50' : ''} ${dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-sky-400/50 bg-sky-50/30 transition-all' : ''}`}
            >
              {reorderItemLines && (
                <div 
                  className="cursor-grab hover:text-sky-600 text-slate-400"
                  onMouseDown={() => setDraggableItemId(item.id)}
                  onMouseUp={() => setDraggableItemId(null)}
                  onMouseLeave={() => setDraggableItemId(null)}
                >
                  <Move size={16} />
                </div>
              )}
              <div className="flex-1 pl-2">
                <input type="text" value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className={`w-full bg-transparent outline-none font-bold placeholder-slate-400 ${isSub ? 'text-slate-600 text-sm' : 'text-sky-800 text-sm'}`} placeholder={isSub ? "Enter Sub-Section Title..." : "Enter Section Title..."} />
              </div>
              <button 
                type="button" 
                onClick={() => addItemLine(index)} 
                className="text-[11px] font-bold bg-sky-50 text-sky-600 hover:bg-sky-100 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                title="Add Item Line below"
              >
                <Plus size={12} /> Add Item
              </button>
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
        const afterFirstDiscount = rowGross - rowDiscount;
        const rowAddDiscount = afterFirstDiscount * ((Number(item.addDiscount) || 0) / 100);
        const afterDiscount = afterFirstDiscount - rowAddDiscount;
        const rowTax = afterDiscount * ((Number(item.taxPercent) || 0) / 100);
        const net = afterDiscount + rowTax;

        const isCompleted = Number(item.dispatchedQty || 0) >= Number(item.quantity || 0) && Number(item.quantity || 0) > 0;
        const ordered = Number(item.quantity || 0);
        const dispatched = Number(item.dispatchedQty || 0);
        const remaining = Math.max(0, ordered - dispatched);

        const matchedInventoryItem = inventoryItems?.find(i => (i.ItemCode || i.code) === item.itemCode);
        const defaultImageUrl = matchedInventoryItem ? (matchedInventoryItem.Thumbnail || matchedInventoryItem.product_image_url) : '';
        const imageUrl = item.thumbnail !== undefined ? item.thumbnail : defaultImageUrl;

        // Compute dynamic live stock qty
        let liveStockQty = '-';
        if (matchedInventoryItem) {
          liveStockQty = Number((matchedInventoryItem.StockQty || 0).toFixed(1));
        }

        return (
          <div 
            key={item.id} 
            draggable={reorderItemLines && draggableItemId === item.id}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`grid gap-3 md:gap-2 items-center bg-white border border-slate-100 md:border-b p-4 md:p-2 rounded-xl md:rounded-none shadow-sm md:shadow-none grid-cols-2 ${showStatus ? 'md:grid-cols-[repeat(18,minmax(0,1fr))]' : showUploadAndRemark ? 'md:grid-cols-[repeat(18,minmax(0,1fr))]' : 'md:grid-cols-[repeat(16,minmax(0,1fr))]'} ${draggedIndex === index ? 'opacity-50' : ''} ${dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-sky-400/50 bg-sky-50/30 transition-all' : ''}`}
          >
            <div className="col-span-2 md:col-span-3 space-y-1">
              <div className="md:hidden text-sm md:text-sm font-bold text-slate-500 uppercase">Item Code</div>
              <div className="flex gap-1 items-center">
                {reorderItemLines && (
                  <div 
                    className="cursor-grab hover:text-sky-600 text-slate-400 hidden md:block"
                    onMouseDown={() => setDraggableItemId(item.id)}
                    onMouseUp={() => setDraggableItemId(null)}
                    onMouseLeave={() => setDraggableItemId(null)}
                  >
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
                    className="w-full border border-slate-200 text-sm px-2 py-1.5 rounded outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 transition-all"
                    placeholder="Search Code..."
                    autoComplete="off"
                  />
                  {activeDropdownId === item.id && (() => {
                    const term = (searchTerms[item.id] ?? '').toLowerCase();
                    const filtered = inventoryItems.filter(i => {
                      const code = (i.ItemCode || i.code || '').toLowerCase();
                      const name = (i.ItemName || i.name || '').toLowerCase();
                      return code.includes(term) || name.includes(term);
                    }).slice(0, 1000);
                    if (filtered.length === 0) return null;
                    return (
                      <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-[200] min-w-[350px] sm:min-w-[450px] max-w-[90vw] overflow-hidden" style={{animation: 'fadeInDown 0.15s ease-out'}}>
                        <div className="max-h-84 overflow-y-auto">
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
                                className={`px-3 py-2 cursor-pointer relative flex items-center transition-colors border-b border-slate-50 last:border-0 ${
                                  isSelected ? 'bg-sky-50' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex flex-col pr-6 w-full">
                                  <span className="text-[11px] text-slate-800 font-bold">
                                    {code}
                                  </span>
                                  {name && (
                                    <span className="text-[10px] text-slate-500 whitespace-normal mt-0.5 line-clamp-2">
                                      {name}
                                    </span>
                                  )}
                                </div>
                                {isSelected && <span className="absolute right-3 text-sky-600 text-sm font-bold">✓</span>}
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
                setEditingImageItem({ id: item.id, itemCode: item.itemCode, imageUrl: imageUrl });
                setTempImageUrl(imageUrl || '');
              }}
            >
              <div className="md:hidden text-sm md:text-sm font-bold text-slate-500 uppercase w-full text-center">Image</div>
              {imageUrl ? (
                <img src={imageUrl} alt="product" className="w-12 h-12 rounded object-cover border border-slate-200 bg-slate-50" />
              ) : (
                <div className="w-12 h-12 rounded bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                  <ImageIcon size={20} />
                </div>
              )}
            </div>

            <div className={`col-span-2 ${showStatus ? 'md:col-span-2' : showUploadAndRemark ? 'md:col-span-2' : 'md:col-span-3'} space-y-1`}>
              <div className="md:hidden text-sm md:text-sm font-bold text-slate-500 uppercase">Description</div>
              <input type="text" value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className="w-full border border-slate-200 text-sm px-2 py-1.5 rounded outline-none" placeholder="Description" />
            </div>
            
            <div className="col-span-1 md:col-span-1 space-y-1 text-center md:text-center">
              <div className="md:hidden text-sm md:text-sm font-bold text-slate-500 uppercase">Stock</div>
              <div className="w-full bg-slate-50 border border-slate-200 text-sm px-1 py-1.5 rounded text-center text-slate-600 font-bold select-none">{liveStockQty}</div>
            </div>
            
            <div className="col-span-1 md:col-span-1 space-y-1 text-center md:text-center">
              <div className="md:hidden text-sm md:text-sm font-bold text-slate-500 uppercase">Qty</div>
              <input id={`qty-${item.id}`} type="number" onWheel={(e) => e.target.blur()} min="0" step="any" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} className="w-full border border-sky-200 text-sky-700 font-bold text-sm px-2 py-1.5 rounded outline-none text-center" />
            </div>

            {/* Act Disp and Rem Qty Columns */}
            {showStatus && (
              <>
                <div className="col-span-1 md:col-span-1 space-y-1 text-center md:text-center">
                  <div className="md:hidden text-sm md:text-sm font-bold text-slate-500 uppercase">Act Disp</div>
                  <div className="w-full bg-slate-50 border border-slate-200 text-sm px-1 py-1 rounded text-center text-sky-700 font-bold select-none">{dispatched}</div>
                </div>
                <div className="col-span-1 md:col-span-1 space-y-1 text-center md:text-center">
                  <div className="md:hidden text-sm md:text-sm font-bold text-slate-500 uppercase">Rem Qty</div>
                  <div className="w-full bg-slate-50 border border-slate-200 text-sm px-1 py-1 rounded text-center text-amber-600 font-bold select-none">{remaining}</div>
                </div>
              </>
            )}

            <div className={`col-span-1 ${showStatus ? 'md:col-span-1' : showUploadAndRemark ? 'md:col-span-1' : 'md:col-span-2'} space-y-1 text-center md:text-center`}>
              <div className="md:hidden text-sm md:text-sm font-bold text-slate-500 uppercase">Unit Price</div>
              <input 
                type="number" 
                onWheel={(e) => e.target.blur()}
                step="any"
                value={item.unitPrice} 
                onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)} 
                onBlur={(e) => { if (item.itemCode && e.target.value) updateItemPrice(item.itemCode, e.target.value); }}
                className="w-full border border-slate-200 text-sm px-2 py-1.5 rounded outline-none text-center" 
              />
            </div>
            <div className="col-span-1 md:col-span-1 space-y-1 text-center md:text-center">
              <div className="md:hidden text-sm md:text-sm font-bold text-slate-500 uppercase">Disc %</div>
              <input type="number" onWheel={(e) => e.target.blur()} step="any" value={item.discountPercent} onChange={(e) => handleItemChange(item.id, 'discountPercent', e.target.value)} className="w-full border border-slate-200 text-sm px-2 py-1.5 rounded outline-none text-center" />
            </div>
            <div className="col-span-1 md:col-span-1 space-y-1 text-center md:text-center">
              <div className="md:hidden text-sm md:text-sm font-bold text-slate-500 uppercase">Add Disc %</div>
              <input type="number" onWheel={(e) => e.target.blur()} step="any" value={item.addDiscount ?? ''} onChange={(e) => handleItemChange(item.id, 'addDiscount', e.target.value)} className="w-full border border-slate-200 text-sm px-2 py-1.5 rounded outline-none text-center" />
            </div>
            <div className="col-span-1 md:col-span-1 space-y-1 text-center md:text-center">
              <div className="md:hidden text-sm md:text-sm font-bold text-slate-500 uppercase">Tax %</div>
              <input type="number" onWheel={(e) => e.target.blur()} step="any" value={item.taxPercent} onChange={(e) => handleItemChange(item.id, 'taxPercent', e.target.value)} className="w-full border border-slate-200 text-sm px-2 py-1.5 rounded outline-none text-center" />
            </div>
            <div className="col-span-1 md:col-span-1 text-left md:text-right font-bold text-emerald-700 text-sm md:pr-1 pt-1 md:pt-0">
              <div className="md:hidden text-sm md:text-sm font-bold text-slate-500 uppercase">Net Amount</div>
              <div className="flex items-center justify-end py-1.5">
                <span className="mr-1 text-emerald-600">₹</span>
                <span className="w-full max-w-[80px] text-right text-emerald-700 text-[13px]">
                  {net ? Number(net).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
            
            {showUploadAndRemark && (
              <>
                <div className="col-span-2 md:col-span-2 space-y-1 text-center md:text-center">
                  <div className="md:hidden text-sm md:text-sm font-bold text-slate-500 uppercase">Remark</div>
                  <input type="text" value={item.remark || ''} onChange={(e) => handleItemChange(item.id, 'remark', e.target.value)} className="w-full border border-slate-200 text-sm px-2 py-1.5 rounded outline-none h-[30px]" placeholder="Remark" />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-1 text-center md:text-center">
                  <div className="md:hidden text-sm md:text-sm font-bold text-slate-500 uppercase">Upload Image</div>
                  <label className="flex items-center justify-center cursor-pointer w-full border border-slate-200 text-sm md:text-sm px-2 rounded outline-none h-[30px] bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold transition-colors">
                    <span className="truncate">{item.image ? item.image.name : 'Upload Image'}</span>
                    <input type="file" accept="image/*" onChange={(e) => handleItemChange(item.id, 'image', e.target.files[0])} className="hidden" />
                  </label>
                </div>
              </>
            )}
            
            {/* Status Column */}
            {showStatus && (
              <div className="col-span-1 md:col-span-2 space-y-1 text-left md:text-center flex flex-col items-start md:items-center justify-center pt-1 md:pt-0">
                <div className="md:hidden text-sm md:text-sm font-bold text-slate-500 uppercase">Status</div>
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

            <div className="col-span-2 md:col-span-1 flex justify-end md:justify-center pt-2 md:pt-0 border-t border-slate-100 md:border-0 mt-2 md:mt-0 gap-1">
              <button 
                type="button" 
                onClick={() => {
                  if (!item.itemCode) {
                    toast.error("Please select an item code first.");
                    return;
                  }
                  const matchedInventoryItem = inventoryItems.find(i => (i.ItemCode || i.code) === item.itemCode);
                  if (matchedInventoryItem) {
                    setProductToEdit(matchedInventoryItem);
                    setIsAddProductOpen(true);
                  } else {
                    toast.error("Product details not found.");
                  }
                }} 
                className="p-1.5 text-sky-500 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors"
                title="Edit Product"
              >
                <Edit size={14} />
              </button>
              <button type="button" onClick={() => removeItemLine(item.id)} disabled={items.length === 1} className="p-1.5 text-red-400 hover:text-red-650 hover:bg-red-50 rounded transition-colors disabled:opacity-30" title="Delete Line">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
      {/* Add Product Modal */}
      <AddProductModal 
        isOpen={isAddProductOpen} 
        initialData={productToEdit}
        onClose={() => {
          setIsAddProductOpen(false);
          setProductToEdit(null);
        }} 
      />

      {/* Edit Image Modal with live preview */}
      {editingImageItem && (
        <div 
          onPaste={(e) => {
            const items = e.clipboardData?.items;
            if (items) {
              for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                  const file = items[i].getAsFile();
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    setTempImageUrl(event.target.result);
                    toast.success("Image pasted from clipboard!");
                  };
                  reader.readAsDataURL(file);
                  e.preventDefault();
                  break;
                }
              }
            }
          }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Update Product Image</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Item Code: <span className="text-sky-600 font-semibold">{editingImageItem.itemCode}</span></p>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingImageItem(null)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Preview Area */}
              <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl p-2 bg-slate-50/50 min-h-[240px]">
                {tempImageUrl ? (
                  <div className="flex flex-col items-center justify-center w-full">
                    <img 
                      src={tempImageUrl} 
                      alt="Preview" 
                      className="max-h-[200px] w-auto max-w-full rounded-lg object-contain border border-slate-200 bg-white p-1"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const element = document.getElementById('preview-error-msg');
                        if (element) element.style.display = 'flex';
                      }}
                      onLoad={(e) => {
                        e.target.style.display = 'block';
                        const element = document.getElementById('preview-error-msg');
                        if (element) element.style.display = 'none';
                      }}
                    />
                    <div id="preview-error-msg" className="hidden flex-col items-center justify-center text-rose-500">
                      <ImageIcon size={48} className="text-rose-400 stroke-[1.5]" />
                      <span className="text-[11px] font-medium mt-1">Invalid Image Link</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                    <ImageIcon size={48} className="stroke-[1.5] mb-2" />
                    <span className="text-xs font-bold text-slate-600">No Image</span>
                    <span className="text-[10px] text-slate-400 mt-1">Upload a file, paste image URL, or copy an image and press Ctrl+V directly to paste</span>
                  </div>
                )}
              </div>

              {/* Upload & Paste Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center justify-center gap-1.5 cursor-pointer px-3 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-100 rounded-lg text-xs font-bold text-sky-700 transition shadow-sm">
                  <Upload size={14} />
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setTempImageUrl(event.target.result);
                          toast.success("Image uploaded!");
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const clipboardItems = await navigator.clipboard.read();
                      for (const clipboardItem of clipboardItems) {
                        for (const type of clipboardItem.types) {
                          if (type.startsWith('image/')) {
                            const blob = await clipboardItem.getType(type);
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setTempImageUrl(event.target.result);
                              toast.success("Image pasted from clipboard!");
                            };
                            reader.readAsDataURL(blob);
                            return;
                          }
                        }
                      }
                      toast.error("No image found in clipboard. Copy an image file/screenshot first.");
                    } catch (err) {
                      toast.error("Clipboard permission denied. Please use Ctrl+V to paste the image directly.");
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition shadow-sm"
                >
                  <Clipboard size={14} />
                  Paste Clipboard
                </button>
              </div>

              {/* Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider">Image URL</label>
                <textarea
                  value={tempImageUrl}
                  onChange={(e) => setTempImageUrl(e.target.value)}
                  placeholder="Paste your image URL here..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-xs md:text-sm h-[80px] resize-none bg-white outline-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setEditingImageItem(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalUrl = tempImageUrl.trim();
                  handleItemChange(editingImageItem.id, 'thumbnail', finalUrl);
                  updateItemImage(editingImageItem.itemCode, finalUrl);
                  setEditingImageItem(null);
                  toast.success("Image updated successfully!");
                }}
                className="px-3 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
