import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Search, RotateCcw, Box, Tag, Layers, DollarSign, Filter, RefreshCw, Plus, Image as ImageIcon, Edit } from 'lucide-react';
import DataTable from '../../components/DataTable';
import SearchableDropdown from '../../components/SearchableDropdown';
import ModalView from '../../components/ModalView';
import ModalForm from '../../components/ModalForm';
import useDataStore from '../../store/dataStore';

export default function ItemDetails() {
  const { items, isLoading, error, fetchItems, addNewItem, updateItem, inventorySummary, fetchInventorySummary, brands, fetchBrands, addBrand } = useDataStore();

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showBrandInput, setShowBrandInput] = useState(false);
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newItemData, setNewItemData] = useState({
    ItemCode: '',
    ItemName: '',
    BrandName: '',
    MRP: '',
    ImageURL: ''
  });
  const [editFormData, setEditFormData] = useState({
    id: '',
    ItemCode: '',
    ItemName: '',
    BrandName: '',
    MRP: '',
    ImageURL: ''
  });

  // Filters State
  const [filters, setFilters] = useState({
    searchQuery: '',
    brand: '',
    itemName: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    fetchItems(true);
    fetchInventorySummary();
    fetchBrands();
  }, [fetchItems, fetchInventorySummary, fetchBrands]);

  const handleClearFilters = () => {
    setFilters({
      searchQuery: '',
      brand: '',
      itemName: ''
    });
    setCurrentPage(1);
    toast.success('Filters cleared');
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newItemData.ItemCode || !newItemData.ItemName || !newItemData.BrandName) {
      toast.error('Item Code, Item Name and Brand are required');
      return;
    }
    
    setIsSubmitting(true);
    if (showBrandInput) {
      setIsAddingBrand(true);
      await addBrand(newItemData.BrandName);
      setIsAddingBrand(false);
    }
    const res = await addNewItem(newItemData);
    setIsSubmitting(false);
    
    if (res.success) {
      toast.success('Product added successfully!');
      setIsAddModalOpen(false);
      setNewItemData({ ItemCode: '', ItemName: '', BrandName: '', MRP: '', ImageURL: '' });
    } else {
      toast.error(res.error || 'Failed to add product');
    }
  };

  const handleEditClick = (item) => {
    setEditFormData({
      id: item.ItmID || item.id,
      ItemCode: item.ItemCode || '',
      ItemName: item.ItemName || '',
      BrandName: item.BrandName || '',
      MRP: item.MRP || '',
      StockQty: item.StockQty || '',
      ImageURL: item.Thumbnail || item.product_image_url || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editFormData.ItemCode || !editFormData.ItemName || !editFormData.BrandName) {
      toast.error('Item Code, Item Name and Brand are required');
      return;
    }
    
    setIsSubmitting(true);
    if (showBrandInput) {
      setIsAddingBrand(true);
      await addBrand(editFormData.BrandName);
      setIsAddingBrand(false);
    }
    const res = await updateItem(editFormData.id, editFormData);
    setIsSubmitting(false);
    
    if (res.success) {
      toast.success('Product updated successfully!');
      setIsEditModalOpen(false);
    } else {
      toast.error(res.error || 'Failed to update product');
    }
  };

  // Unique lists for Filters Dropdowns

  const brandsList = useMemo(() => {
    return Array.from(new Set([
      ...(brands || []).map(b => b.name),
      ...items.map(i => i.BrandName || i.brand)
    ])).filter(Boolean).sort();
  }, [items, brands]);

  const itemNamesList = useMemo(() => {
    return Array.from(new Set(items.map(i => i.ItemName || i.name))).filter(Boolean).sort();
  }, [items]);

  // Apply filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const brnd = item.BrandName || item.brand || '';
      const name = item.ItemName || item.name || '';
      const code = item.ItemCode || item.code || '';

      if (filters.brand && brnd !== filters.brand) return false;
      if (filters.itemName && name !== filters.itemName) return false;

      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        return (
          code.toLowerCase().includes(q) ||
          name.toLowerCase().includes(q) ||
          brnd.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, filters]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const tableHeaders = [
    "Serial No", "Image", "Item Code", "Item Name", "Brand", "Unit Price / MRP", "Stock", "Actions"
  ];

  const renderRow = ( item, idx) => {
    const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
    const priceVal = Number(item.MRP || item.price || 0);
    const liveStockQty = Number((item.StockQty || 0).toFixed(1));

    return (
      <tr key={item.ItmID || item.code} className="hover:bg-sky-50/25 transition-colors border-b border-gray-100">
        <td className="px-4 py-3 text-center text-xs text-slate-500 whitespace-nowrap">{globalIdx}</td>
        <td className="px-4 py-3 text-center">
          {item.Thumbnail ? (
            <img src={item.Thumbnail} alt={item.ItemName} className="w-9 h-9 rounded-lg object-cover border border-slate-200 mx-auto bg-slate-50" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <ImageIcon size={14} />
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-center text-xs text-slate-900 font-bold whitespace-nowrap">{item.ItemCode}</td>
        <td className="px-4 py-3 text-justify text-xs font-semibold text-slate-900 whitespace-normal uppercase min-w-[350px]">{item.ItemName}</td>
        <td className="px-4 py-3 text-center text-[11px] text-slate-700 whitespace-nowrap">{item.BrandName}</td>
        <td className="px-4 py-3 text-center text-xs text-emerald-600 font-bold whitespace-nowrap">₹{priceVal.toLocaleString('en-IN')}</td>
        <td className="px-4 py-3 text-center text-xs text-sky-600 font-black whitespace-nowrap">{liveStockQty}</td>
        <td className="px-4 py-3 text-center whitespace-nowrap">
          <button 
            onClick={() => handleEditClick(item)}
            className="p-1.5 bg-slate-50 text-sky-600 hover:bg-sky-100 hover:text-sky-700 rounded-lg transition-colors border border-slate-200 shadow-sm"
            title="Edit Product"
          >
            <Edit size={14} />
          </button>
        </td>
      </tr>
    );
  };

  const renderCard = (item, idx) => {
    const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
    const priceVal = Number(item.MRP || item.price || 0);
    const liveStockQty = Number((item.StockQty || 0).toFixed(1));

    return (
      <div key={item.ItmID || item.code} className="bg-white rounded-xl border border-sky-50 shadow-sm p-4 space-y-3 transition-all hover:shadow-md hover:border-sky-100">
        <div className="flex justify-between items-start pb-3 border-b border-slate-50 gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="w-6 h-6 mt-0.5 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-500 flex-shrink-0">
              {globalIdx}
            </span>
            <span className="text-sm font-bold text-gray-900 uppercase break-words whitespace-normal leading-tight">{item.ItemName}</span>
          </div>
          <span className="bg-sky-50 text-sky-700 border border-sky-100 px-2 py-1 rounded text-[10px] font-black uppercase flex-shrink-0 mt-0.5">
            {item.ItemCode}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 rounded-lg p-3 border border-slate-100/50">

          <div>
            <span className="text-gray-400 block uppercase text-[10px] tracking-tight mb-0.5">Brand</span>
            <span className="text-gray-800 font-semibold break-words whitespace-normal block leading-tight">{item.BrandName}</span>
          </div>
          <div>
            <span className="text-gray-400 block uppercase text-[10px] tracking-tight mb-0.5">Stock</span>
            <span className="text-sky-600 font-bold text-base">{liveStockQty}</span>
          </div>
          <div className="col-span-2 pt-2 border-t border-slate-200/30 flex justify-between items-center mt-1">
            <span className="text-gray-400 block uppercase text-[10px] tracking-tight">Unit Price / MRP</span>
            <span className="text-emerald-600 font-bold text-base">₹{priceVal.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    );
  };

  // Loading skeleton rendering
  const renderSkeletons = () => {
    return (
      <div className="space-y-4 p-6">
        <div className="flex gap-4 items-center">
          <div className="h-10 bg-slate-100 rounded w-1/3 animate-pulse"></div>
          <div className="h-10 bg-slate-100 rounded w-1/4 animate-pulse"></div>
          <div className="h-10 bg-slate-100 rounded w-1/4 animate-pulse"></div>
        </div>
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 rounded animate-pulse flex items-center justify-between px-4">
              <div className="h-4 bg-slate-100 rounded w-12"></div>
              <div className="h-4 bg-slate-100 rounded w-24"></div>
              <div className="h-4 bg-slate-100 rounded w-48"></div>
              <div className="h-4 bg-slate-100 rounded w-24"></div>
              <div className="h-4 bg-slate-100 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-4 md:space-y-6 flex flex-col h-full min-h-0">
      
      {/* Header Toolbar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-4 w-full px-2 sm:px-0">
        <div className="flex flex-col lg:flex-row w-full gap-2 lg:gap-3 items-center">
          <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-3 top-[12px] text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search items..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-xs md:text-sm h-[38px] transition-all outline-none"
              />
            </div>

            {/* Mobile Add Product Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="lg:hidden flex items-center justify-center bg-sky-600 hover:bg-sky-700 text-white rounded-xl h-[38px] w-[38px] flex-shrink-0 shadow-sm transition active:scale-95"
              title="Add Product"
            >
              <Plus size={18} />
            </button>

            <button
               onClick={() => setShowMobileFilters(!showMobileFilters)}
               className={`lg:hidden flex items-center justify-center rounded-xl shadow-sm h-[38px] w-[38px] flex-shrink-0 transition-all ${showMobileFilters ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-white border border-slate-200 text-slate-650 hover:bg-slate-50'}`}
               title="Toggle Filters"
            >
              <Filter size={15} />
            </button>
            <button
              onClick={() => fetchItems(true)}
              className="flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl h-[38px] w-[38px] flex-shrink-0 shadow-sm transition active:scale-95"
              title="Reload from API"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin text-sky-600' : ''} />
            </button>
            <button
              onClick={handleClearFilters}
              className="lg:hidden flex items-center justify-center bg-slate-50 text-slate-500 border border-slate-200 rounded-xl h-[38px] w-[38px] flex-shrink-0 shadow-sm active:scale-95"
              title="Clear Filters"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Filtering dropdowns */}
          <div className={`flex flex-wrap gap-2 w-full lg:w-auto lg:flex-[6] overflow-visible justify-start lg:justify-end pb-1 pt-1`}>
            


            {/* Brand Dropdown */}
            <div className="flex-1 min-w-0 lg:min-w-[160px]">
              <SearchableDropdown
                options={brandsList.map(b => ({ value: b, label: b }))}
                value={filters.brand}
                onChange={(val) => setFilters({ ...filters, brand: val })}
                placeholder="All Brands"
                className="h-[38px]"
                height="h-[38px]"
                rounded="rounded-xl"
              />
            </div>

            {/* Item Name Dropdown */}
            <div className="flex-1 min-w-0 lg:min-w-[180px]">
              <SearchableDropdown
                options={itemNamesList.map(n => ({ value: n, label: n }))}
                value={filters.itemName}
                onChange={(val) => setFilters({ ...filters, itemName: val })}
                placeholder="All Item Names"
                className="h-[38px]"
                height="h-[38px]"
                rounded="rounded-xl"
              />
            </div>

            <button
              onClick={handleClearFilters}
              className="hidden lg:flex items-center justify-center bg-slate-50 text-slate-500 border border-slate-200 rounded-xl w-[38px] h-[38px] hover:bg-slate-150 transition-colors shadow-sm"
              title="Clear Filters"
            >
              <RotateCcw size={16} />
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="hidden lg:flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl px-4 h-[38px] flex-shrink-0 shadow-sm transition active:scale-95 font-semibold text-sm whitespace-nowrap ml-1"
            >
              <Plus size={16} /> <span>Add Product</span>
            </button>

          </div>
        </div>
      </div>

      {/* Main Content Area using DataTable */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          renderSkeletons()
        ) : error ? (
          <div className="p-12 text-center space-y-4">
            <p className="text-red-500 font-semibold">{error}</p>
            <button
              onClick={() => fetchItems(true)}
              className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
            >
              Retry Loading
            </button>
          </div>
        ) : (
          <DataTable
            headers={tableHeaders}
            data={paginatedItems}
            renderRow={renderRow}
            renderCard={renderCard}
            minWidth="1000px"
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
            totalResults={filteredItems.length}
            itemsPerPageOptions={[50, 100, 200, 500, 1000]}
          />
        )}
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <ModalForm
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add New Product"
          onSubmit={handleAddProduct}
          submitText={isSubmitting ? 'Saving...' : 'Save Product'}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 pt-2">
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
                    disabled={isAddingBrand}
                  />
                ) : (
                  <select
                    value={newItemData.BrandName}
                    onChange={(e) => setNewItemData({ ...newItemData, BrandName: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                  >
                    <option value="">Select a brand *</option>
                    {brandsList.map((brand, idx) => (
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
                value={newItemData.StockQty || ''}
                onChange={(e) => setNewItemData({ ...newItemData, StockQty: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Product Image (Optional)</label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0 overflow-hidden">
                  {newItemData.ImageURL ? (
                    <img src={newItemData.ImageURL} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={24} />
                  )}
                </div>
                <input
                  type="text"
                  value={newItemData.ImageURL}
                  onChange={(e) => setNewItemData({ ...newItemData, ImageURL: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                  placeholder="Paste Image URL or Base64 here..."
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 ml-12">Currently supports image URLs. Storage bucket configuration required for direct file uploads.</p>
            </div>

          </div>
        </ModalForm>
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && (
        <ModalForm
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Product"
          onSubmit={handleUpdateProduct}
          submitText={isSubmitting ? 'Updating...' : 'Update Product'}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Item Code *</label>
              <input
                type="text"
                required
                value={editFormData.ItemCode}
                onChange={(e) => setEditFormData({ ...editFormData, ItemCode: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                placeholder="e.g. ITM-1001"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Item Name *</label>
              <input
                type="text"
                required
                value={editFormData.ItemName}
                onChange={(e) => setEditFormData({ ...editFormData, ItemName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                placeholder="e.g. Premium Ceramic Tile"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Brand *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBrandInput(!showBrandInput);
                      if (showBrandInput) setEditFormData(prev => ({ ...prev, BrandName: '' }));
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
                    value={editFormData.BrandName}
                    onChange={(e) => setEditFormData({ ...editFormData, BrandName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                    placeholder="Enter new brand name..."
                    autoFocus
                    disabled={isAddingBrand}
                  />
                ) : (
                  <select
                    value={editFormData.BrandName}
                    onChange={(e) => setEditFormData({ ...editFormData, BrandName: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                  >
                    <option value="">Select a brand *</option>
                    {brandsList.map((brand, idx) => (
                      <option key={idx} value={brand}>{brand}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Unit Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-[11px] text-slate-500 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editFormData.MRP}
                    onChange={(e) => setEditFormData({ ...editFormData, MRP: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Stock</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editFormData.StockQty || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, StockQty: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Product Image (Optional)</label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0 overflow-hidden">
                  {editFormData.ImageURL ? (
                    <img src={editFormData.ImageURL} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={24} />
                  )}
                </div>
                <input
                  type="text"
                  value={editFormData.ImageURL}
                  onChange={(e) => setEditFormData({ ...editFormData, ImageURL: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                  placeholder="Paste Image URL or Base64 here..."
                />
              </div>
            </div>

          </div>
        </ModalForm>
      )}

    </div>
  );
}
