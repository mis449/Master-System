import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react';
import ModalForm from './ModalForm';
import useDataStore from '../store/dataStore';

export default function AddProductModal({ isOpen, onClose, initialData }) {
  const { addNewItem, updateItem, items } = useDataStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBrandInput, setShowBrandInput] = useState(false);
  
  const uniqueBrands = Array.from(new Set(items.map(i => i.BrandName || i.brand || i.ITMBrandName).filter(Boolean))).sort();
  const [newItemData, setNewItemData] = useState({
    ItemCode: '',
    ItemName: '',
    BrandName: '',
    MRP: '',
    StockQty: '',
    ImageURL: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const initialBrand = initialData.BrandName || initialData.brand || '';
        setNewItemData({
          ItemCode: initialData.ItemCode || initialData.code || '',
          ItemName: initialData.ItemName || initialData.name || '',
          BrandName: initialBrand,
          MRP: initialData.MRP || initialData.price || '',
          StockQty: initialData.StockQty || initialData.stock || '',
          ImageURL: initialData.Thumbnail || initialData.product_image_url || ''
        });
        if (initialBrand && !uniqueBrands.includes(initialBrand)) {
          setShowBrandInput(true);
        } else {
          setShowBrandInput(false);
        }
      } else {
        setNewItemData({ ItemCode: '', ItemName: '', BrandName: '', MRP: '', StockQty: '', ImageURL: '' });
        setShowBrandInput(false);
      }
    }
  }, [isOpen, initialData]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newItemData.ItemCode || !newItemData.ItemName || !newItemData.BrandName) {
      toast.error('Item Code, Item Name and Brand are required');
      return;
    }
    
    setIsSubmitting(true);
    let res;
    if (initialData) {
      res = await updateItem(initialData.ItmID || initialData.id, newItemData);
    } else {
      res = await addNewItem(newItemData);
    }
    setIsSubmitting(false);
    
    if (res && res.success) {
      toast.success(initialData ? 'Product updated successfully!' : 'Product added successfully!');
      onClose();
      setNewItemData({ ItemCode: '', ItemName: '', BrandName: '', MRP: '', StockQty: '', ImageURL: '' });
    } else {
      toast.error(res?.error || 'Failed to save product');
    }
  };

  if (!isOpen) return null;

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Product" : "Add New Product"}
      onSubmit={handleAddProduct}
      submitText={isSubmitting ? 'Saving...' : (initialData ? 'Update Product' : 'Save Product')}
      maxWidth="max-w-md"
    >
      <div className="space-y-4 pt-2 text-left">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Item Code *</label>
          <input
            type="text"
            required
            value={newItemData.ItemCode}
            onChange={(e) => setNewItemData({ ...newItemData, ItemCode: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            placeholder="e.g. ITM-1001"
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Item Name *</label>
          <input
            type="text"
            required
            value={newItemData.ItemName}
            onChange={(e) => setNewItemData({ ...newItemData, ItemName: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            placeholder="e.g. Premium Ceramic Tile"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Brand *</label>
              <button
                type="button"
                onClick={() => {
                  setShowBrandInput(!showBrandInput);
                  if (showBrandInput) setNewItemData(prev => ({ ...prev, BrandName: '' }));
                }}
                className="text-[10px] flex items-center gap-0.5 text-sky-600 hover:text-sky-800 font-bold bg-sky-50 px-1.5 py-0.5 rounded transition-colors"
              >
                {showBrandInput ? <X size={10} /> : <Plus size={10} />}
                {showBrandInput ? 'Cancel' : 'Add New'}
              </button>
            </div>
            {showBrandInput ? (
              <input
                type="text"
                required
                value={newItemData.BrandName}
                onChange={(e) => setNewItemData({ ...newItemData, BrandName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                placeholder="Enter new brand name..."
                autoFocus
              />
            ) : (
              <select
                value={newItemData.BrandName}
                onChange={(e) => setNewItemData({ ...newItemData, BrandName: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              >
                <option value="">Select a brand *</option>
                {uniqueBrands.map((brand, idx) => (
                  <option key={idx} value={brand}>{brand}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Unit Price / MRP</label>
            <div className="relative">
              <span className="absolute left-3 top-[11px] text-slate-500 font-bold text-sm">₹</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newItemData.MRP}
                onChange={(e) => setNewItemData({ ...newItemData, MRP: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Initial Stock</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={newItemData.StockQty}
            onChange={(e) => setNewItemData({ ...newItemData, StockQty: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Image URL</label>
          <input
            type="text"
            value={newItemData.ImageURL}
            onChange={(e) => setNewItemData({ ...newItemData, ImageURL: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            placeholder="https://example.com/image.jpg"
          />
        </div>
      </div>
    </ModalForm>
  );
}
