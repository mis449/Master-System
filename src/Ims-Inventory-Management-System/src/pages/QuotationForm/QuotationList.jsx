import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Search, Plus, RotateCcw, Filter, RefreshCw, Download, Edit, Eye, Trash2, FileText, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import DataTable from '../../components/DataTable';
import { TabSwitcher } from '../../components/StandardButtons';
import QuotationFormModal from './QuotationFormModal';
import { getQuotations, getQuotationById, deleteQuotation, createQuotation, updateQuotation, getQuotationHistory, getQuotationCounts } from '../../services/quotationService';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import useDataStore from '../../store/dataStore';

export default function QuotationList({ onConvertToInvoice, onConvertToChallan, mode = 'sales' }) {
  const { quotations, setQuotations, customers, fetchCustomers } = useDataStore();
  const [isLoading, setIsLoading] = useState(false);
  
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [activeTab, setActiveTab] = useState(mode === 'orders' ? 'Confirmed' : 'Active');
  const [selectedHistoryBaseNo, setSelectedHistoryBaseNo] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  const [filters, setFilters] = useState({
    searchQuery: ''
  });
  // Only the search box is debounced. Tab / page / page-size changes are
  // deliberate single actions and must fetch immediately.
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const [historyData, setHistoryData] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [openingId, setOpeningId] = useState(null);
  const [totalResults, setTotalResults] = useState(0);
  const [tabCounts, setTabCounts] = useState({ Active: 0, Accepted: 0, Rejected: 0, Confirmed: 0, 'In Progress': 0, Completed: 0 });

  // Order tabs track invoiced progress: nothing invoiced -> Confirmed,
  // partly invoiced -> In Progress, fully invoiced -> Completed.
  const tabDefinitions = useMemo(() => (
    mode === 'orders'
      ? [
          { id: 'Confirmed', label: 'Confirmed' },
          { id: 'In Progress', label: 'In Progress' },
          { id: 'Completed', label: 'Completed' }
        ]
      : [
          { id: 'Active', label: 'Active' },
          { id: 'Accepted', label: 'Accepted' },
          { id: 'Rejected', label: 'Rejected' }
        ]
  ), [mode]);

  // Fetch quotations (Server-side paginated)
  const fetchQuotationsData = async () => {
    setIsLoading(true);
    try {
      const [{ data, count }, counts] = await Promise.all([
        getQuotations({
          page: currentPage,
          limit: itemsPerPage,
          searchQuery: debouncedSearch,
          activeTab
        }),
        getQuotationCounts(debouncedSearch, tabDefinitions.map(t => t.id))
      ]);
      setQuotations(data || []);
      setTotalResults(count || 0);
      setTabCounts(counts || { Active: 0, Accepted: 0, Rejected: 0, Confirmed: 0, 'In Progress': 0, Completed: 0 });
    } catch (error) {
      toast.error('Failed to fetch quotations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (filters.searchQuery === debouncedSearch) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [filters.searchQuery, debouncedSearch]);

  useEffect(() => {
    fetchQuotationsData();
  }, [currentPage, itemsPerPage, debouncedSearch, activeTab]);

  const handleClearFilters = () => {
    setFilters({ searchQuery: '' });
    setDebouncedSearch(''); // clear is an explicit action — don't wait out the debounce
    setCurrentPage(1);
    toast.success('Filters cleared');
  };

  const handleRefresh = () => {
    fetchQuotationsData();
    toast.success('Data refreshed');
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this quotation?')) {
      try {
        await deleteQuotation(id);
        setQuotations(prev => prev.filter(q => String(q.id) !== String(id)));
        toast.success('Quotation deleted successfully');
      } catch (error) {
        toast.error('Failed to delete quotation');
      }
    }
  };

  const getExportData = () => {
    return enrichedQuotations.map(item => [
      item.quotationNo || '-',
      item.date || '-',
      item.customerName || '-',
      item.state || '-',
      item.mobileNumber || '-',
      item.displaySalesPerson || '-',
      `Rs. ${Number(item.totalAmount || 0).toLocaleString('en-IN')}`,
      ...(mode === 'orders'
        ? [item.hasProgress ? `${item.pendingQty} (${item.invoicedQty}/${item.orderedQty} invoiced)` : '-']
        : []),
      item.status === 'Final' ? 'Completed' : (item.status || 'Draft')
    ]);
  };

  const exportHeaders = [
    "Quot #", "Quot Date", "Customer", "State", "Mobile", "Sales Person", "Amount",
    ...(mode === 'orders' ? ["Pending Qty"] : []),
    "Quot Status"
  ];

  const handleExportPdf = () => {
    exportToPDF(getExportData(), exportHeaders, 'Quotations', 'quotations');
    toast.success('Exported to PDF successfully!');
  };

  const handleExportExcel = () => {
    exportToExcel(getExportData(), exportHeaders, 'quotations');
    toast.success('Exported to Excel successfully!');
  };

  /**
   * List rows are light (no details / item lines) so a page of 50 stays small.
   * Hydrate the single record being opened before handing it to the form modal.
   */
  const openQuotation = async (item, { preview = false, revision = false } = {}) => {
    if (!item) return;
    setOpeningId(item.id);
    try {
      const full = item.isListRow ? await getQuotationById(item.id) : item;
      if (!full) {
        toast.error('Failed to load quotation');
        return;
      }
      setSelectedQuotation(revision ? { ...full, isRevisionMode: true } : full);
      setIsPreviewMode(preview);
      setShowFormModal(true);
    } catch (err) {
      toast.error('Failed to load quotation');
    } finally {
      setOpeningId(null);
    }
  };

  const handleView = (item) => openQuotation(item);

  // Filter Logic
  // Display logic
  const enrichedQuotations = useMemo(() => {
    return (Array.isArray(quotations) ? quotations : []).map(q => {
      const cust = customers.find(c => 
        (c.name === q.customerName) || 
        (c.company === q.customerName) || 
        (c.firstName && q.customerName.includes(c.firstName))
      );
      
      const customerKey = (q.customerName || 'Unknown Customer').trim().toUpperCase();
      const match = (q.quotationNo || '').match(/^(QUOT-\d+)(?:-R(\d+))?$/);
      let baseNo = q.quotationNo;
      let revNo = 0;
      if (match) {
        baseNo = match[1];
        revNo = match[2] ? parseInt(match[2], 10) : 0;
      }

      return {
        ...q,
        _revNo: revNo,
        _baseNo: baseNo,
        _customerKey: customerKey,
        displaySalesPerson: cust?.salesPerson || q.salesPerson
      };
    });
  }, [quotations, customers]);

  const totalPages = Math.ceil(totalResults / itemsPerPage) || 1;
  const paginatedQuotations = enrichedQuotations; // Server already paginated it

  const getStatusColor = (status) => {
    const colors = {
      'Active': 'bg-sky-100 text-sky-700',
      'Accepted': 'bg-emerald-100 text-emerald-700',
      'Rejected': 'bg-rose-100 text-rose-700',
      'In Progress': 'bg-amber-100 text-amber-700',
      'Completed': 'bg-indigo-100 text-indigo-700',
      'Final': 'bg-indigo-100 text-indigo-700' // Backward compatibility
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };


  const isOrdersMode = mode === 'orders';

  const tableHeaders = isOrdersMode
    ? [
        "Quot #", "Quot Date", "Customer", "State",
        "Mobile", "Sales Person", "Amount", "Pending Qty", "Quot Status", "Actions"
      ]
    : [
        "Quot #", "Quot Date", "Customer", "State",
        "Mobile", "Sales Person", "Amount", "Quot Status", "Actions"
      ];

  // Pending is quoted qty minus invoiced qty. Orders saved before invoiced
  // tracking existed have no summary, so show '-' instead of a misleading 0.
  const renderPendingCell = (item) => (
    <td key="pending" className="px-4 py-3 text-center whitespace-nowrap">
      {item.hasProgress ? (
        <>
          <span className={`inline-block px-2.5 py-1 rounded text-[12px] font-black ${
            item.pendingQty > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {item.pendingQty}
          </span>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">
            {item.invoicedQty}/{item.orderedQty} inv
          </div>
        </>
      ) : (
        <span className="text-[13px] text-slate-400 font-bold">-</span>
      )}
    </td>
  );

  const renderRow = (item, idx) => (
    <tr 
      key={item.id || idx} 
      onClick={() => handleView(item)}
      className="hover:bg-sky-50/50 transition-colors border-b border-slate-100 cursor-pointer"
    >
      <td className="px-4 py-3 text-center text-[14px] text-sky-700 font-bold whitespace-nowrap">
        {item.quotationNo || '-'}
      </td>
      <td className="px-4 py-3 text-center text-[14px] text-slate-700 font-bold whitespace-nowrap">{item.date || '-'}</td>
      <td className="px-6 py-4 text-center text-[15px] font-black text-slate-900 whitespace-nowrap min-w-[250px]">{item.customerName || '-'}</td>
      <td className="px-4 py-3 text-center text-[14px] font-bold text-slate-800 whitespace-nowrap">{item.state || '-'}</td>
      <td className="px-4 py-3 text-center text-[14px] font-bold text-slate-800 whitespace-nowrap">{item.mobileNumber || '-'}</td>
      <td className="px-4 py-3 text-center text-[14px] font-bold text-slate-800 whitespace-nowrap">{item.displaySalesPerson || '-'}</td>
      <td className="px-4 py-3 text-center text-[16px] text-emerald-700 font-black whitespace-nowrap">₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}</td>
      {isOrdersMode && renderPendingCell(item)}
      <td className="px-4 py-3 text-center whitespace-nowrap text-sm">
        <span className={`px-3 py-1 rounded text-[11px] uppercase font-black tracking-wider shadow-sm ${getStatusColor(item.status)}`}>
          {item.status === 'Final' ? 'Completed' : (item.status || 'Draft')}
        </span>
      </td>
      <td className="px-4 py-3 text-center whitespace-nowrap flex items-center justify-center gap-2">
        {openingId === item.id && (
          <Loader2 size={14} className="animate-spin text-sky-600" />
        )}
        {activeTab === 'Active' && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); openQuotation(item, { preview: true }); }}
              className="px-3 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 rounded text-[11px] font-bold transition shadow-sm"
            >
              Preview
            </button>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                handleOpenHistory(item._baseNo); 
              }}
              className="px-3 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 rounded text-[11px] font-bold transition shadow-sm"
            >
              Versions
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); openQuotation(item, { revision: true }); }}
              className="px-3 py-1 bg-sky-600 text-white hover:bg-sky-700 rounded border border-sky-700 text-[11px] font-bold transition shadow-sm"
            >
              Revise
            </button>
          </>
        )}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(item.id);
          }} 
          className="p-1 ml-1 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded transition shadow-sm" 
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );

  const renderCard = (item, idx) => (
    <div 
      key={item.id || idx} 
      onClick={() => handleView(item)}
      className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3 transition-all hover:shadow-md hover:border-sky-100 cursor-pointer"
    >
      <div className="flex justify-between items-center pb-2 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-sky-600">
            #{item.quotationNo}
          </span>
          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black ${getStatusColor(item.status)}`}>
            {item.status === 'Final' ? 'Completed' : (item.status || 'Draft')}
          </span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleOpenHistory(item._baseNo);
            }} 
            className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded hover:bg-sky-100 hover:text-sky-700 transition flex items-center gap-1"
          >
            <RotateCcw size={10} /> History
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(item.id);
            }} 
            className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-500 hover:text-white transition"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-y-2 text-xs">
        <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Customer</span> <span className="font-semibold text-slate-800">{item.customerName}</span></div>
        <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Sales Person</span> <span className="text-slate-600">{item.displaySalesPerson}</span></div>
        <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Amount</span> <span className="font-bold text-emerald-600">₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}</span></div>
        {isOrdersMode && (
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Pending Qty</span>
            {item.hasProgress ? (
              <span className={`font-bold ${item.pendingQty > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {item.pendingQty} <span className="text-slate-400 font-semibold">({item.invoicedQty}/{item.orderedQty} inv)</span>
              </span>
            ) : (
              <span className="text-slate-400 font-bold">-</span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const handleOpenHistory = async (baseNo) => {
    setSelectedHistoryBaseNo(baseNo);
    setIsHistoryLoading(true);
    try {
      const history = await getQuotationHistory(baseNo);
      setHistoryData(history);
    } catch (err) {
      toast.error('Failed to load history');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-4 md:space-y-6 flex flex-col h-full min-h-0">
      
      {/* Header Filters & Add Button */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-4 w-full px-2 sm:px-0">
        <div className="flex flex-col lg:flex-row w-full gap-2 lg:gap-3 items-center">
          
          <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-3 top-[12px] text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search quotations..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-xs md:text-sm h-[38px] transition-all outline-none"
              />
            </div>
            <button
               onClick={() => setShowMobileFilters(!showMobileFilters)}
               className={`lg:hidden flex items-center justify-center rounded-xl shadow-sm h-[38px] w-[38px] flex-shrink-0 transition-all ${showMobileFilters ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-white border border-slate-200 text-slate-650 hover:bg-slate-50'}`}
               title="Toggle Filters"
            >
              <Filter size={15} />
            </button>
            {mode !== 'orders' && (
              <button
                onClick={() => {
                  setSelectedQuotation(null);
                  setShowFormModal(true);
                }}
                className="lg:hidden flex items-center justify-center bg-sky-600 text-white rounded-xl h-[38px] w-[38px] flex-shrink-0 shadow-md shadow-sky-100 active:scale-95"
                title="Add Quotation"
              >
                <Plus size={18} />
              </button>
            )}
            <button
              onClick={handleClearFilters}
              className="lg:hidden flex items-center justify-center bg-slate-50 text-slate-500 border border-slate-200 rounded-xl h-[38px] w-[38px] flex-shrink-0 shadow-sm active:scale-95"
              title="Clear Filters"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          <div className={`flex flex-wrap gap-2 w-full lg:w-auto lg:flex-[6] overflow-visible justify-start lg:justify-end pb-1 pt-1`}>
            <button
              onClick={handleRefresh}
              className="flex items-center justify-center gap-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl px-4 h-[38px] transition-colors shadow-sm text-xs font-semibold"
              title="Refresh"
            >
              <RefreshCw size={14} /> <span className="inline">Refresh</span>
            </button>
            
            {/* Custom Pagination */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg shadow-sm h-[38px] hidden md:flex">
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium outline-none focus:ring-1 focus:ring-sky-500"
              >
                {[20, 50, 100].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 font-medium px-1 whitespace-nowrap hidden lg:inline">
                {totalResults > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}-{Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults}
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

            <button
              onClick={handleExportPdf}
              className="flex items-center justify-center gap-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-xl px-4 h-[38px] transition-colors shadow-sm text-xs font-semibold"
              title="Export PDF"
            >
              <FileText size={14} /> <span className="inline">PDF</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-xl px-4 h-[38px] transition-colors shadow-sm text-xs font-semibold"
              title="Export Excel"
            >
              <Download size={14} /> <span className="inline">Excel</span>
            </button>
            <button
              onClick={handleClearFilters}
              className="hidden lg:flex items-center justify-center bg-slate-50 text-slate-500 border border-slate-200 rounded-xl w-[38px] h-[38px] hover:bg-slate-150 transition-colors shadow-sm"
              title="Clear Filters"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {mode !== 'orders' && (
          <button
            onClick={() => {
              setSelectedQuotation(null);
              setShowFormModal(true);
            }}
            className="hidden lg:flex bg-sky-600 hover:bg-sky-700 text-white rounded-xl items-center justify-center gap-1.5 transition shadow-md shadow-sky-100 h-[38px] px-4 flex-shrink-0 text-xs font-bold"
            title="Add Quotation"
          >
            <Plus size={16} /> Quotation Form
          </button>
        )}
      </div>

      {/* Tabs Switcher for Quotation Status */}
      <div className="px-2 sm:px-0">
        <TabSwitcher
          activeTab={activeTab}
          onTabChange={(tab) => { setActiveTab(tab); setCurrentPage(1); }}
          tabs={tabDefinitions.map(t => ({ ...t, count: tabCounts[t.id] || 0 }))}
        />
      </div>



      {/* Main DataTable */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 w-full p-6">
            <div className="space-y-4 w-full">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-10 bg-slate-100 rounded-lg w-1/6 animate-pulse"></div>
                  <div className="h-10 bg-slate-100 rounded-lg w-1/6 animate-pulse"></div>
                  <div className="h-10 bg-slate-100 rounded-lg w-2/6 animate-pulse"></div>
                  <div className="h-10 bg-slate-100 rounded-lg w-1/6 animate-pulse"></div>
                  <div className="h-10 bg-slate-100 rounded-lg w-1/6 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <DataTable
            headers={tableHeaders}
            data={paginatedQuotations}
            renderRow={renderRow}
            renderCard={renderCard}
            minWidth="1000px"
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
            totalResults={totalResults}
            itemsPerPageOptions={[20, 50, 100]}
            hidePagination={true}
          />
        )}
      </div>

      {/* Pop-up Form Modal */}
      {showFormModal && (
        <QuotationFormModal
          isOpen={showFormModal}
          initialData={selectedQuotation}
          defaultToPrintPreview={isPreviewMode}
          mode={mode}
          hideAcceptReject={isOrdersMode}
          onAddNewQuotation={() => {
            setSelectedQuotation(null);
            setIsPreviewMode(false);
          }}
          onClose={() => {
            setShowFormModal(false);
            setSelectedQuotation(null);
            setIsPreviewMode(false);
          }}
          onSave={(savedQuotation, closeModal = true) => {
            if (selectedQuotation) {
              setQuotations(prev => {
                const existingIndex = prev.findIndex(q => String(q.id) === String(savedQuotation.id));
                if (existingIndex !== -1) {
                  const newArr = [...prev];
                  newArr[existingIndex] = savedQuotation;
                  return newArr;
                }
                return [...prev, savedQuotation];
              });
              // Do not show double toast for Accept since QuotationFormModal handles it
              if (closeModal) toast.success('Quotation updated successfully');
            } else {
              setQuotations(prev => [...prev, savedQuotation]);
              if (closeModal) toast.success('Quotation saved successfully');
            }
            if (closeModal) {
              setShowFormModal(false);
              setSelectedQuotation(null);
            } else {
              // Keep modal open but update selectedQuotation so initialData has the saved id
              // This ensures Undo will update the existing record, not create a new one
              setSelectedQuotation(savedQuotation);
            }
          }}
          onConvertToInvoice={onConvertToInvoice}
          onConvertToChallan={onConvertToChallan}
          onDelete={async (id) => {
            await handleDelete(id);
            setShowFormModal(false);
            setSelectedQuotation(null);
          }}
          onCopy={async (copiedData) => {
            try {
              const created = await createQuotation(copiedData);
              setQuotations(prev => [...prev, created]);
              toast.success('Quotation copied successfully');
              setSelectedQuotation(created);
            } catch (err) {
              toast.error('Failed to copy quotation');
            }
          }}
        />
      )}

      {/* History Modal */}
      {selectedHistoryBaseNo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 md:py-12 md:px-8">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh] my-auto">
            <div className="flex items-center justify-between p-5 md:px-6 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <RotateCcw className="text-sky-600" size={20} />
                Quotations — {selectedHistoryBaseNo}
              </h3>
              <button 
                onClick={() => {
                  setSelectedHistoryBaseNo(null);
                  setHistoryData([]);
                }}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="p-6 bg-slate-50/30 overflow-y-auto space-y-4">
              {isHistoryLoading ? (
                <div className="text-center p-6 text-slate-500 font-medium animate-pulse">Loading history...</div>
              ) : historyData.length === 0 ? (
                <div className="text-center p-6 text-slate-500 font-medium">No history found.</div>
              ) : (
                historyData.map((rev, index) => (
                  <div key={rev.id} className="border border-slate-200 bg-white rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-sky-300 hover:shadow-md transition-all shadow-sm">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[16px] font-black text-sky-800">{rev.quotationNo}</span>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wider ${index === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {index === 0 ? 'LATEST' : 'PREVIOUS'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex flex-col gap-1 mt-2">
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          <span>Amount: <span className="font-bold text-slate-700 text-[13px]">₹{Number(rev.totalAmount || 0).toLocaleString('en-IN')}</span></span>
                          <span className="text-slate-300">|</span>
                          <span>Date: <span className="font-semibold text-slate-600">{rev.date}</span></span>
                          <span className="text-slate-300">|</span>
                          <span>Customer: <span className="font-semibold text-slate-600">{rev.customerName}</span></span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] items-center">
                          <span>Quot. Person: <span className="font-semibold text-slate-600">{rev.quortPerson || rev.salesPerson || '-'}</span></span>
                          <span className="text-slate-300">|</span>
                          <span className="text-[13px] text-slate-800 font-bold">Type: <span className="font-black text-sky-800">{rev.type_of_quotation || 'Standard'}</span></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedHistoryBaseNo(null);
                          openQuotation(rev);
                        }}
                        className="px-4 py-1.5 bg-white border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
                      >
                        <FileText size={16} /> Open
                      </button>
                      <button
                        onClick={() => {
                          setSelectedHistoryBaseNo(null);
                          openQuotation(rev, { preview: true });
                        }}
                        className="px-4 py-1.5 bg-white border border-slate-200 hover:border-sky-200 hover:bg-sky-50 text-slate-700 hover:text-sky-700 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
                      >
                        <Eye size={16} /> Preview
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
