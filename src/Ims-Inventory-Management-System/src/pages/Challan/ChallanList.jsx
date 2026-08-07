import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Eye, Trash2, ShoppingCart, Undo2, Copy, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { getChallans, deleteChallan } from '../../services/ChallanService';
import ChallanFormModal from './ChallanFormModal';
import DispatchFormModal from '../Sales/DispatchFormModal';
import { getRemainingItemsToChallan } from '../../utils/orderProgress';

// A challan's item lines live in the `items` JSON column. Section / sub-section
// rows are headings and carry no quantity.
const getChallanLines = (challan) =>
  (challan?.items || []).filter(l => l && l.type !== 'section' && l.type !== 'subsection');

const getChallanQty = (challan) =>
  getChallanLines(challan).reduce((sum, l) => sum + (Number(l.quantity || 0) || 0), 0);

const getChallanLineCount = (challan) => getChallanLines(challan).length;

export default function ChallanList({ conversionContext, clearConversionContext, onConvertToInvoice }) {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedDispatchChallan, setSelectedDispatchChallan] = useState(null);
  const [previewChallan, setPreviewChallan] = useState(null);
  const [downloadChallan, setDownloadChallan] = useState(null);

  useEffect(() => {
    fetchChallans();
  }, []);

  useEffect(() => {
    if (!conversionContext || !conversionContext.data) return;
    // Wait for existing challans, otherwise the remaining qty would be computed
    // as if nothing had been sent out yet.
    if (loading) return;

    const orderNo = conversionContext.data.quotationNo || '';

    // Quantities already sent out on earlier challans for this same order.
    const previousChallanItems = challans
      .filter(c => (c.order_no || '').trim() === orderNo.trim() && c.status !== 'Cancelled')
      .map(c => c.items || []);

    let remainingItems = getRemainingItemsToChallan(
      conversionContext.data.details?.items || [],
      previousChallanItems
    );

    // Apply the pending quantity logic (orderedQty - dispatchedQty) directly from the quotation items
    remainingItems = remainingItems.map(item => {
      if (item.type && item.type !== 'item') return item;
      const ordered = Number(item.orderedQty !== undefined ? item.orderedQty : (item.quantity || 0));
      const dispatched = Number(item.dispatchedQty || 0);
      const pending = Math.max(0, ordered - dispatched);
      return { ...item, quantity: pending };
    });

    const hasSomethingToSend = remainingItems.some(i => !i.type || i.type === 'item');

    if (clearConversionContext) {
      clearConversionContext();
    }

    if (!hasSomethingToSend) {
      toast.error('All items on this order have already been challaned.');
      return;
    }

    // Auto-open modal for conversion
    const newChallan = {
      challan_no: `CH-${Math.floor(1000 + Math.random() * 9000)}`,
      challan_date: new Date().toISOString().split('T')[0],
      customer_name: conversionContext.data.details?.basicInfo?.customer || conversionContext.data.customerName || '',
      address: conversionContext.data.details?.basicInfo?.address || '',
      order_no: orderNo,
      quotation_id: conversionContext.data.id || '',
      order_date: conversionContext.data.date || '',
      through: '',
      items: remainingItems,
      pipe: '',
      box: '',
      bag: '',
      bdls: '',
      total: '',
      status: 'Active'
    };
    setSelectedChallan(newChallan);
    setShowFormModal(true);
  }, [conversionContext, clearConversionContext, challans, loading]);

  const fetchChallans = async () => {
    try {
      setLoading(true);
      const data = await getChallans();
      setChallans(data);
    } catch (error) {
      toast.error('Failed to load challans');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this challan?')) {
      try {
        await deleteChallan(id);
        setChallans(prev => prev.filter(c => c.id !== id));
        toast.success('Challan deleted successfully');
      } catch (error) {
        toast.error('Failed to delete challan');
      }
    }
  };

  const filteredChallans = challans.filter(c => 
    c.status !== 'Completed' &&
    ((c.challan_no?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (c.customer_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl relative">
      <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50 rounded-t-2xl">
        <div className="flex-1 w-full max-w-md relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search by challan no, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm"
          />
        </div>
        
        <button
          onClick={() => {
            setSelectedChallan(null);
            setShowFormModal(true);
          }}
          className="w-full md:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Create Challan
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : filteredChallans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <FileText size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">No challans found</p>
            <p className="text-sm">Create a new challan to get started.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-black text-slate-500 tracking-wider">
                    <th className="px-4 py-3 text-center w-16">SN</th>
                    <th className="px-4 py-3">Challan No</th>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Order No</th>
                    <th className="px-4 py-3 text-center">Challan Qty</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredChallans.map((challan, idx) => (
                    <tr 
                      key={challan.id} 
                      className="hover:bg-emerald-50/30 transition-colors group cursor-pointer" 
                      onClick={() => { setSelectedChallan(challan); setShowFormModal(true); }}
                    >
                      <td className="px-4 py-3 text-center text-sm font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-black text-emerald-800 bg-emerald-50 px-2 py-1 rounded">{challan.challan_no}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-800">
                        {challan.customer_name}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-600">
                        {challan.challan_date}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-600">
                        {challan.order_no || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-black text-sky-700 bg-sky-50 px-2.5 py-1 rounded">
                          {getChallanQty(challan)}
                        </span>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                          {getChallanLineCount(challan)} {getChallanLineCount(challan) === 1 ? 'item' : 'items'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase whitespace-nowrap ${
                          challan.status === 'Completed' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : challan.status === 'In Progress'
                              ? 'bg-sky-100 text-sky-700'
                              : challan.status === 'Active' 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-slate-100 text-slate-600'
                        }`}>
                          {challan.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewChallan(challan);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-sm"
                            title="Preview challan"
                          >
                            <Eye size={14} /> Preview
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDownloadChallan(challan);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 border border-sky-100 hover:bg-sky-600 hover:text-white text-sky-700 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-sm"
                            title="Download challan PDF"
                          >
                            <Download size={14} /> PDF
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDispatchChallan(challan);
                              setShowDispatchModal(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-sm"
                          >
                            <ShoppingCart size={14} /> Dispatch
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(challan.id); }}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Read-only preview of an existing challan (same print layout as the PDF) */}
      {previewChallan && (
        <ChallanFormModal
          isOpen={true}
          initialData={previewChallan}
          defaultToPreview={true}
          onClose={() => setPreviewChallan(null)}
          onSave={(savedChallan) => {
            setChallans(prev => prev.map(c => String(c.id) === String(savedChallan.id) ? savedChallan : c));
            setPreviewChallan(null);
          }}
        />
      )}

      {/* Download straight from the row: renders the print layout, saves the PDF, closes itself */}
      {downloadChallan && (
        <ChallanFormModal
          isOpen={true}
          initialData={downloadChallan}
          defaultToPreview={true}
          autoDownload={true}
          onClose={() => setDownloadChallan(null)}
          onSave={() => setDownloadChallan(null)}
        />
      )}

      {showFormModal && (
        <ChallanFormModal
          isOpen={showFormModal}
          initialData={selectedChallan}
          onClose={() => {
            setShowFormModal(false);
            setSelectedChallan(null);
          }}
          onSave={(savedChallan) => {
            setChallans(prev => {
              const idx = prev.findIndex(c => c.id === savedChallan.id);
              if (idx !== -1) {
                const newArr = [...prev];
                newArr[idx] = savedChallan;
                return newArr;
              }
              return [savedChallan, ...prev];
            });
            setShowFormModal(false);
            setSelectedChallan(null);
            toast.success('Challan saved successfully');
          }}
        />
      )}

      {showDispatchModal && (
        <DispatchFormModal
          isOpen={showDispatchModal}
          initialData={{
            ...selectedDispatchChallan,
            details: {
              ...(selectedDispatchChallan?.details || {}),
              items: selectedDispatchChallan?.items || selectedDispatchChallan?.details?.items || []
            }
          }}
          onClose={() => {
            setShowDispatchModal(false);
            setSelectedDispatchChallan(null);
          }}
          onConvertToInvoice={(data) => {
            setShowDispatchModal(false);
            setSelectedDispatchChallan(null);
            
            // Map Challan data format to Invoice data format
            const mappedInvoiceData = {
              ...data,
              invoiceNo: '',
              date: new Date().toISOString().split('T')[0],
              details: {
                ...(data.details || {}),
                basicInfo: {
                  customer: data.customer_name || '',
                  address: data.address || '',
                  ...((data.details && data.details.basicInfo) ? data.details.basicInfo : {})
                },
                otherInfo: {
                  referenceNumber: data.challan_no || '',
                  ...((data.details && data.details.otherInfo) ? data.details.otherInfo : {})
                }
              }
            };

            if (onConvertToInvoice) {
              onConvertToInvoice(mappedInvoiceData);
            }
          }}
        />
      )}
    </div>
  );
}
