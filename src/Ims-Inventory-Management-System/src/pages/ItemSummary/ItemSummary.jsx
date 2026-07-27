import React, { useState, useEffect, useMemo } from 'react';
import { Package, TrendingUp, Activity, AlertTriangle, Search, Filter, Box, ChevronLeft, ChevronRight } from 'lucide-react';
import useDataStore from '../../store/dataStore';
import { getInvoices } from '../../services/InvoiceService';
import DataTable from '../../components/DataTable';

export default function ItemSummary() {
  const { items, fetchItems, inventorySummary, fetchInventorySummary } = useDataStore();
  const [salesData, setSalesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    fetchItems();
    fetchInventorySummary();

    const fetchSalesData = async () => {
      try {
        const invoices = await getInvoices();
        const salesDates = {};

        // Extract items from invoices to find the latest sale date for each item
        (invoices || []).forEach(inv => {
          if (inv.status !== 'Cancelled') {
            const invoiceDate = inv.date || inv.invoiceDate;
            const itemsList = inv.items || inv.details?.items || [];
            
            itemsList.forEach(item => {
              if (item.type === 'heading' || item.type === 'section') return;
              const code = (item.itemCode || item.code || item.ItemCode || '').toString().trim().toLowerCase();
              if (code && invoiceDate) {
                const dTime = new Date(invoiceDate).getTime();
                if (!salesDates[code] || dTime > salesDates[code]) {
                  salesDates[code] = dTime;
                }
              }
            });
          }
        });
        setSalesData(salesDates);
      } catch (err) {
        console.error("Error fetching sales data", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalesData();
  }, [fetchItems, fetchInventorySummary]);



  const uniqueBrands = useMemo(() => {
    const brands = new Set(items.map(i => i.Brand?.trim() || i.ITMBrandName?.trim() || i.brand?.trim()).filter(Boolean));
    return ['All', ...Array.from(brands).sort()];
  }, [items]);

  const enrichedItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    
    const today = Date.now();
    const oneDay = 1000 * 3600 * 24;

    return items.map(item => {
      const code = (item.ItemCode || item.code || '').toString().trim().toLowerCase();
      const lastSaleTime = salesData[code];
      const dbSummary = (inventorySummary || []).find(s => s.item_code?.toString().trim().toLowerCase() === code) || {};
      const stock = item.StockQty || dbSummary.closing_qty || 0;

      let status = 'Dead Stock';
      let statusColor = 'bg-rose-100 text-rose-700';
      let daysSinceLastSale = -1;
      let lastSaleDateStr = '-';

      if (lastSaleTime) {
        daysSinceLastSale = Math.floor((today - lastSaleTime) / oneDay);
        lastSaleDateStr = new Date(lastSaleTime).toLocaleDateString('en-GB');

        if (daysSinceLastSale <= 90) {
          status = 'Fast Moving';
          statusColor = 'bg-emerald-100 text-emerald-700';
        } else if (daysSinceLastSale <= 120) {
          status = 'Slow Moving';
          statusColor = 'bg-amber-100 text-amber-700';
        } else {
          status = 'Dead Stock';
          statusColor = 'bg-rose-100 text-rose-700';
        }
      }

      return {
        ...item,
        currentStock: stock,
        lastSaleDateStr,
        daysSinceLastSale,
        status,
        statusColor
      };
    });
  }, [items, salesData, inventorySummary]);

  const filteredItems = useMemo(() => {
    return enrichedItems.filter(item => {
      const itemBrand = item.Brand || item.ITMBrandName || item.brand;
      if (brandFilter !== 'All' && itemBrand !== brandFilter) return false;

      if (statusFilter !== 'All' && item.status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (item.ItemCode || '').toLowerCase().includes(term) ||
               (item.ItemName || item.description || '').toLowerCase().includes(term);
      }
      return true;
    });
  }, [enrichedItems, brandFilter, statusFilter, searchTerm]);

  // Analytics counts
  const summaryCounts = useMemo(() => {
    let fast = 0, slow = 0, dead = 0;
    enrichedItems.forEach(i => {
      if (i.status === 'Fast Moving') fast++;
      else if (i.status === 'Slow Moving') slow++;
      else dead++;
    });
    return { fast, slow, dead, total: enrichedItems.length };
  }, [enrichedItems]);

  const tableHeaders = [
    "Image", "Item Code", "Item Name", "Brand", "Stock", "Last Sale Date", "Days Since", "Status"
  ];

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderRow = (item, idx) => (
    <tr key={idx} className="hover:bg-sky-50/50 transition-colors border-b border-slate-100">
      <td className="px-4 py-2 text-center">
        {item.Thumbnail ? (
          <img src={item.Thumbnail} alt="product" className="h-10 w-10 object-contain mx-auto rounded" />
        ) : (
          <div className="h-10 w-10 bg-slate-100 text-slate-300 flex items-center justify-center mx-auto rounded">
            <Package size={16} />
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-center font-black text-sky-700 text-sm whitespace-nowrap">{item.ItemCode || item.code}</td>
      <td className="px-4 py-3 text-left font-bold text-slate-800 text-sm truncate max-w-[200px]" title={item.ItemName || item.description}>
        {item.ItemName || item.description || '-'}
      </td>
      <td className="px-4 py-3 text-center font-semibold text-slate-600 text-sm">
        {item.Brand || item.ITMBrandName || item.brand || '-'}
      </td>

      <td className="px-4 py-3 text-center font-bold text-slate-800 text-sm">
        {item.currentStock > 0 ? item.currentStock : <span className="text-slate-400">0</span>}
      </td>
      <td className="px-4 py-3 text-center text-slate-600 font-medium text-sm">{item.lastSaleDateStr}</td>
      <td className="px-4 py-3 text-center font-bold text-slate-700 text-sm">
        {item.daysSinceLastSale >= 0 ? `${item.daysSinceLastSale} days` : '-'}
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`px-2.5 py-1 rounded text-[10px] uppercase font-black tracking-wider ${item.statusColor}`}>
          {item.status}
        </span>
      </td>
    </tr>
  );

  const renderCard = (item, idx) => (
    <div key={idx} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
      <div className="flex justify-between items-center pb-2 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-sky-700">#{item.ItemCode || item.code}</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-wider ${item.statusColor}`}>
          {item.status}
        </span>
      </div>
      <div className="flex gap-3 items-center">
        {item.Thumbnail ? (
          <img src={item.Thumbnail} alt="product" className="h-12 w-12 object-contain rounded" />
        ) : (
          <div className="h-12 w-12 bg-slate-100 text-slate-300 flex items-center justify-center rounded">
            <Package size={20} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">{item.ItemName || item.description}</p>
          <p className="text-xs text-slate-500 font-semibold">{item.Category || item.category}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-y-2 text-xs pt-2 border-t border-slate-50">
        <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Stock</span> <span className="font-semibold text-slate-800">{item.currentStock}</span></div>
        <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Days Since Sale</span> <span className="font-semibold text-slate-800">{item.daysSinceLastSale >= 0 ? item.daysSinceLastSale : '-'}</span></div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full h-full overflow-hidden flex flex-col bg-slate-50/50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Activity className="text-sky-600" size={28} />
          Stock Reports
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Track fast moving, slow moving, and dead stock items</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Fast Moving</span>
            <TrendingUp size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{summaryCounts.fast}</p>
          <p className="text-[10px] text-slate-400 mt-1 font-semibold">&le; 90 days</p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Slow Moving</span>
            <Activity size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">{summaryCounts.slow}</p>
          <p className="text-[10px] text-slate-400 mt-1 font-semibold">91 - 120 days</p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-rose-500">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Dead Stock</span>
            <AlertTriangle size={18} className="text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600">{summaryCounts.dead}</p>
          <p className="text-[10px] text-slate-400 mt-1 font-semibold">&gt; 120 days / No sales</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-64 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium"
          />
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="All" disabled hidden>Brand</option>
              {uniqueBrands.map(brand => (
                <option key={brand} value={brand}>{brand === 'All' ? 'All Brands' : brand}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg shadow-sm">
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium outline-none focus:ring-1 focus:ring-sky-500"
            >
              {[20, 50, 100, 500].map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
            <span className="text-[10px] text-slate-500 font-medium px-1 whitespace-nowrap">
              {filteredItems.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length}
            </span>
            <button
              onClick={() => setCurrentPage(c => c - 1)}
              disabled={currentPage === 1}
              className="p-1 bg-white border border-slate-200 rounded disabled:opacity-50 hover:bg-slate-100 text-sky-600"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[10px] font-bold text-slate-600 px-1 whitespace-nowrap">{currentPage} / {totalPages || 1}</span>
            <button
              onClick={() => setCurrentPage(c => c + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1 bg-white border border-slate-200 rounded disabled:opacity-50 hover:bg-slate-100 text-sky-600"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {['All', 'Fast Moving', 'Slow Moving', 'Dead Stock'].map(status => {
              const activeColor = 
                status === 'Fast Moving' ? 'text-emerald-600' :
                status === 'Slow Moving' ? 'text-orange-500' :
                status === 'Dead Stock' ? 'text-red-600' :
                'text-sky-700';
              
              return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  statusFilter === status 
                    ? `bg-white shadow-sm ${activeColor}` 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                {status}
              </button>
            )})}
          </div>
        </div>
      </div>

      {/* Main DataTable */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
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
            itemsPerPageOptions={[20, 50, 100, 500]}
            hidePagination={true}
          />
        )}
      </div>
    </div>
  );
}
