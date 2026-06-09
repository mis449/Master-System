import React, { useState } from 'react';
import toast from 'react-hot-toast';
import ModalForm from './ModalForm';
import useDataStore from '../store/dataStore';

export default function AddProductModal({ isOpen, onClose }) {
  const { addNewItem } = useDataStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newItemData, setNewItemData] = useState({
    ItemCode: '',
    ItemName: '',
    BrandName: '',
    MRP: '',
    StockQty: '',
    ImageURL: ''
  });

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newItemData.ItemCode || !newItemData.ItemName) {
      toast.error('Item Code and Item Name are required');
      return;
    }
    
    setIsSubmitting(true);
    const res = await addNewItem(newItemData);
    setIsSubmitting(false);
    
    if (res.success) {
      toast.success('Product added successfully!');
      onClose();
      setNewItemData({ ItemCode: '', ItemName: '', BrandName: '', MRP: '', StockQty: '', ImageURL: '' });
    } else {
      toast.error(res.error || 'Failed to add product');
    }
  };

  if (!isOpen) return null;

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Product"
      onSubmit={handleAddProduct}
      submitText={isSubmitting ? 'Saving...' : 'Save Product'}
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
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Brand</label>
            <input
              type="text"
              value={newItemData.BrandName}
              onChange={(e) => setNewItemData({ ...newItemData, BrandName: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              placeholder="e.g. TOTO"
            />
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
