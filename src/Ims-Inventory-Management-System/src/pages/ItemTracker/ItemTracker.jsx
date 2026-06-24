import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Calendar, 
  Filter, 
  Download, 
  Printer,
  PackageSearch,
  Box,
  TrendingUp,
  TrendingDown,
  Clock,
  User,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import useDataStore from '../../store/dataStore';
import SearchableDropdown from '../../components/SearchableDropdown';

// Local storage services
import { getQuotations } from '../../services/quotationService';
import { getInvoices } from '../../services/InvoiceService';
import { getSalesReturns } from '../../services/SalesReturnService';
import { getPurchases } from '../../services/PurchaseService';
import { getPurchaseOrders } from '../../services/PurchaseOrderService';
import { getPurchaseReturns } from '../../services/PurchaseReturnService';

export default function ItemTracker() {
  const { items, fetchItems, transactions, fetchTransactions, inventorySummary, fetchInventorySummary, isLoading } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [localTransactions, setLocalTransactions] = useState([]);
  
  // Filters
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [typeFilter, setTypeFilter] = useState('All');
  const [partyFilter, setPartyFilter] = useState('');
  
  useEffect(() => {
    fetchItems();
    fetchTransactions();
    fetchInventorySummary();

    // Fetch local transactions for testing period
    const fetchLocal = async () => {
      try {
        const [
          quotations, invoices, salesReturns, 
          purchases, purchaseOrders, purchaseReturns
        ] = await Promise.all([
          getQuotations(), getInvoices(), getSalesReturns(),
          getPurchases(), getPurchaseOrders(), getPurchaseReturns()
        ]);

        const mapped = [];

        // Helper: extract items from a record with proper field mapping per source
        // Falls back to top-level item_code/item_quantity columns if items array is empty
        const extractFrom = (records, type, getParty, getRef, getItemsList) => {
          (records || []).forEach(record => {
            let itemsList = getItemsList(record);

            // Fallback: if items array is empty but record has top-level item_code column
            if ((!itemsList || itemsList.length === 0) && record.item_code) {
              itemsList = [{
                itemCode: record.item_code,
                description: record.item_description || '',
                quantity: Number(record.item_quantity) || 0,
                type: 'item'
              }];
            }

            if (!itemsList || itemsList.length === 0) return;

            itemsList.forEach(item => {
              if (!item) return;
              const code = item.itemCode || item.code || item.item_code || item.ItemCode || '';
              if (!code) return;
              if (item.type === 'heading' || item.type === 'section' || item.type === 'subsection') return;
              mapped.push({
                id: `${record.id}-${item.id || Math.random()}`,
                date: record.date || record.invoiceDate || record.orderDate || record.docDate || '',
                type,
                itemCode: code,
                itemName: item.description || item.itemName || item.item_description || item.ItemName || '',
                vendorName: getParty(record),
                qty: Number(item.quantity || item.qty || item.dispatchQty || item.item_quantity || 0),
                remarks: getRef(record)
              });
            });
          });
        };

        // Sales Orders (Quotations) — items: record.items (top-level, already extracted by mapQuotationRow)
        extractFrom(quotations, 'Quotation',
          r => r.customerName || r.customer || r.company || '',
          r => r.quotationNo || r.docNo || r.id || '',
          r => r.items || r.details?.items || []
        );

        // Sales Invoices — items in record.items or record.details.items
        extractFrom(invoices, 'Invoice',
          r => r.customerName || r.customer || r.company || '',
          r => r.invoiceNo || r.docNo || r.id || '',
          r => r.items || r.details?.items || []
        );

        // Sales Returns — items in record.items or record.details.items
        extractFrom(salesReturns, 'Sales Return',
          r => r.customerName || r.customer || r.company || '',
          r => r.SalesReturnNo || r.return_no || r.docNo || r.id || '',
          r => r.items || r.details?.items || []
        );

        // Purchases — items stored in record.details.items (mapped from purchase_items relational table)
        extractFrom(purchases, 'Purchase',
          r => r.vendorName || r.vendor || r.company || '',
          r => r.purchaseNo || r.docNo || r.id || '',
          r => r.details?.items || r.items || []
        );

        // Purchase Orders — items in record.details.items or record.items
        extractFrom(purchaseOrders, 'Purchase Order',
          r => r.vendorName || r.vendor || r.company || '',
          r => r.purchaseOrderNo || r.docNo || r.id || '',
          r => r.details?.items || r.items || []
        );

        // Purchase Returns — items in record.details.items or record.items
        extractFrom(purchaseReturns, 'Purchase Return',
          r => r.vendorName || r.vendor || r.company || '',
          r => r.purchaseReturnNo || r.docNo || r.id || '',
          r => r.details?.items || r.items || []
        );

        setLocalTransactions(mapped);
      } catch (e) {
        console.error("Error loading local transactions", e);
      }
    };
    fetchLocal();
  }, [fetchItems, fetchTransactions]);

  // Use only localTransactions (service-fetched from invoice/purchase/etc tables)
  // to avoid double-counting with inventory_transactions store
  const allTransactions = useMemo(() => {
    return localTransactions;
  }, [localTransactions]);

  // Derive unique transaction types and parties for filters
  const uniqueTypes = useMemo(() => {
    const types = new Set(allTransactions.map(t => t.type));
    return ['All', ...Array.from(types).filter(Boolean)];
  }, [allTransactions]);

  const uniqueParties = useMemo(() => {
    const parties = new Set(allTransactions.map(t => t.vendorName || t.customerName || t.company || t.customer));
    return Array.from(parties).filter(Boolean);
  }, [allTransactions]);

  // Handle Item Selection from search
  const handleItemSelect = (inputStr) => {
    if (!inputStr) {
      setSelectedItemCode('');
      setSearchTerm('');
      return;
    }
    let code = inputStr;
    const found = items.find(i => 
      i.itemCode?.toLowerCase() === inputStr.toLowerCase() || 
      i.description?.toLowerCase() === inputStr.toLowerCase()
    );
    if (found) {
      code = found.itemCode;
    }
    setSelectedItemCode(code);
    setSearchTerm(code); // Update input to show selected code
  };

  // Filter and Calculate Stock
  const trackerData = useMemo(() => {
    if (!selectedItemCode) return { history: [], summary: {} };

    // 1. Get all transactions for this item
    let itemTx = allTransactions.filter(t => t.itemCode?.toLowerCase() === selectedItemCode.toLowerCase());
    
    // If invoice or dispatch has occurred for this item, filter out quotation / sales order
    const hasInvoiceOrDispatch = itemTx.some(t => {
      const type = (t.type || '').toLowerCase();
      return type === 'invoice' || type === 'sales invoice' || type.includes('dispatch');
    });

    if (hasInvoiceOrDispatch) {
      itemTx = itemTx.filter(t => {
        const type = (t.type || '').toLowerCase();
        return type !== 'quotation' && type !== 'sales order';
      });
    }

    // 2. Sort Oldest to Newest to calculate running balance
    const sortedTx = [...itemTx].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let balance = 0;
    let totalPurchased = 0;
    let totalSold = 0;
    
    const enriched = sortedTx.map(tx => {
      const qty = Number(tx.qty || 0);
      let change = 0;
      const type = (tx.type || '').toLowerCase();
      
      // Normalize type to handle all variants from different sources
      const isPurchase = type === 'purchase';
      const isPurchaseOrder = type === 'purchase order';
      const isPurchaseReturn = type === 'purchase return' || type === 'purchase_return';
      const isSalesInvoice = type === 'sales invoice' || type === 'sales' || type === 'invoice';
      const isSalesOrder = type === 'sales order' || type === 'quotation';
      const isSalesReturn = type === 'sales return' || type === 'sales_return';

      if (isPurchase) {
        // Purchase adds stock
        change = qty;
        totalPurchased += qty;
      } else if (isPurchaseOrder) {
        // Purchase Order is pending — does NOT affect actual stock
        change = 0;
      } else if (isPurchaseReturn) {
        // Purchase Return reduces stock
        change = -qty;
        totalPurchased = Math.max(0, totalPurchased - qty);
      } else if (isSalesInvoice) {
        // Sales Invoice reduces stock
        change = -qty;
        totalSold += qty;
      } else if (isSalesOrder) {
        // Sales Order is pending — does NOT affect actual stock
        change = 0;
      } else if (isSalesReturn) {
        // Sales Return adds stock back
        change = qty;
        totalSold = Math.max(0, totalSold - qty);
      } else if (type.includes('dispatch')) {
        change = -qty;
        totalSold += qty;
      }
      
      balance += change;
      
      return {
        ...tx,
        change,
        currentStock: balance
      };
    });
    
    // 3. Reverse for display (Newest First)
    enriched.reverse();

    // 4. Apply Secondary Filters
    let filtered = enriched;
    
    // Always hide quotation and sales order from the table view
    filtered = filtered.filter(t => {
      const type = (t.type || '').toLowerCase();
      return type !== 'quotation' && type !== 'sales order';
    });
    
    if (dateRange.start) {
      filtered = filtered.filter(t => new Date(t.date) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      filtered = filtered.filter(t => new Date(t.date) <= new Date(dateRange.end));
    }
    if (typeFilter !== 'All') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }
    if (partyFilter) {
      filtered = filtered.filter(t => {
        const party = t.vendorName || t.customerName || t.company || t.customer || '';
        return party.toLowerCase().includes(partyFilter.toLowerCase());
      });
    }

    // Calculate pending orders quantity
    const totalPendingOrders = sortedTx
      .filter(tx => {
        const typeL = (tx.type || '').toLowerCase();
        return typeL === 'sales order' || typeL === 'quotation';
      })
      .reduce((sum, tx) => sum + Number(tx.qty || 0), 0);

    const lastActualTx = enriched.find(tx => {
      const t = (tx.type || '').toLowerCase();
      return t !== 'sales order' && t !== 'quotation' && t !== 'purchase order';
    });
    const lastTx = enriched.length > 0 ? enriched[0] : null;

    const itemCodeLower = selectedItemCode.toString().trim().toLowerCase();
    const itemDetails = items.find(i => {
      const code = (i.itemCode || i.code || i.ItemCode || '').toString().trim().toLowerCase();
      return code === itemCodeLower;
    });

    const dbSummary = (inventorySummary || []).find(s => 
      s.item_code?.toString().trim().toLowerCase() === itemCodeLower
    ) || {};

    const currentStockVal = itemDetails 
      ? Number(((itemDetails.StockQty || 0) + (dbSummary.closing_qty || 0)).toFixed(1))
      : balance;

    const totalPurchasedVal = dbSummary.purchase_qty !== undefined
      ? Number((dbSummary.purchase_qty || 0).toFixed(1))
      : totalPurchased;

    const totalSoldVal = dbSummary.sales_qty !== undefined
      ? Number((dbSummary.sales_qty || 0).toFixed(1))
      : totalSold;

    return {
      history: filtered,
      summary: {
        currentStock: currentStockVal,
        totalPurchased: totalPurchasedVal,
        totalSold: totalSoldVal,
        totalPendingOrders,
        lastTransactionDate: lastActualTx ? lastActualTx.date : (lastTx ? lastTx.date : null)
      }
    };
  }, [selectedItemCode, allTransactions, dateRange, typeFilter, partyFilter, items, inventorySummary]);

  const { history, summary } = trackerData;
  const selectedItemDetails = items.find(i => {
    const code = (i.itemCode || i.code || i.ItemCode || '').toString().trim().toLowerCase();
    return code === (selectedItemCode || '').toString().trim().toLowerCase();
  });

  // --- PDF Export Logic ---
  const generatePdfDoc = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Company Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); 
    doc.text('PAREKH GALLERIUM', 14, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 132, 199); 
    doc.text('PREMIUM INVENTORY MANAGEMENT SYSTEM', 14, 26);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text('VIP Road, Raipur, Chhattisgarh - 492001', 14, 32);
    doc.text('Phone: +91 98765 43210', 14, 37);
    doc.text('Email: contact@parekhgallerium.com', 14, 42);
    
    // Report Title
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(24);
    doc.setTextColor(148, 163, 184); 
    doc.text('ITEM TRACKER', pageWidth - 14, 20, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`Generated:`, pageWidth - 45, 28, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(), 'dd-MMM-yyyy HH:mm'), pageWidth - 14, 28, { align: 'right' });

    // Item Details Box
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 48, pageWidth - 28, 25, 2, 2, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text('Selected Item Information', 18, 54);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Item Code: ${selectedItemCode || '-'}`, 18, 62);
    doc.text(`Description: ${selectedItemDetails?.description || '-'}`, 18, 68);
    
    doc.text(`Current Stock: ${summary.currentStock || 0}`, pageWidth / 2, 62);
    doc.text(`Total Purchased: ${summary.totalPurchased || 0}`, pageWidth / 2, 68);
    
    doc.text(`Total Sold: ${summary.totalSold || 0}`, pageWidth - 20, 62, { align: 'right' });
    doc.text(`Brand: ${selectedItemDetails?.brand || '-'}`, pageWidth - 20, 68, { align: 'right' });

    // Table
    autoTable(doc, {
      startY: 78,
      head: [['Date', 'Transaction Type', 'Party', 'Qty', 'Stock Balance', 'Remarks']],
      body: history.map(row => [
        format(new Date(row.date), 'dd-MMM-yyyy'),
        row.type || '-',
        row.vendorName || row.customerName || row.company || row.customer || '-',
        row.qty,
        row.currentStock,
        row.remarks || '-'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 25 },
        1: { halign: 'center', cellWidth: 35 },
        2: { halign: 'left' },
        3: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 25, fontStyle: 'bold', textColor: [15, 23, 42] },
        5: { halign: 'left' }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 20, left: 14, right: 14, bottom: 20 },
      didDrawPage: function (data) {
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      }
    });

    return doc;
  };

  const handlePdfDownload = () => {
    if (!selectedItemCode) return;
    const doc = generatePdfDoc();
    doc.save(`ItemTracker_${selectedItemCode}_${format(new Date(), 'ddMMyyyy')}.pdf`);
  };

  const handlePrint = () => {
    if (!selectedItemCode) return;
    const doc = generatePdfDoc();
    const pdfUrl = doc.output('bloburl');
    window.open(pdfUrl, '_blank');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full h-full overflow-y-auto bg-slate-50/50 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <PackageSearch className="text-sky-600" size={28} />
            Item Tracker
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Audit complete transaction history and stock movement</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={handlePdfDownload}
            disabled={!selectedItemCode || history.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 font-bold transition-colors disabled:opacity-50 shadow-sm"
          >
            <Download size={18} /> <span className="hidden sm:inline">Export PDF</span>
          </button>
          <button 
            onClick={handlePrint}
            disabled={!selectedItemCode || history.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-bold transition-colors disabled:opacity-50 shadow-sm shadow-sky-200"
          >
            <Printer size={18} /> <span className="hidden sm:inline">Print Report</span>
          </button>
        </div>
      </div>

      {/* Main Controls Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row flex-wrap gap-4">
          
          {/* Item Search */}
          <div className="flex-[4] min-w-[280px] relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Search Item</label>
            <div className="relative">
              <SearchableDropdown
                options={items.map(i => ({ value: i.itemCode || i.code || i.ItemCode, label: `${i.itemCode || i.code || i.ItemCode} - ${i.description || i.name || i.ItemName}` }))}
                value={selectedItemCode}
                onChange={(val) => handleItemSelect(val)}
                placeholder="Type Item Code or Name..."
                className="w-full"
                height="h-[44px]"
                rounded="rounded-lg"
              />
            </div>
            {searchTerm && !selectedItemCode && (
              <p className="absolute -bottom-5 left-0 text-xs text-amber-600 font-medium whitespace-nowrap">Please select an item from the list to view history.</p>
            )}
          </div>

          {/* Date Filters */}
          <div className="flex-[4] min-w-[280px]">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Date Range</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full min-w-0 px-2 sm:px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 text-sm font-medium outline-none"
                />
              </div>
              <span className="text-slate-400">to</span>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full min-w-0 px-2 sm:px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 text-sm font-medium outline-none"
                />
              </div>
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex-[2] min-w-[160px]">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Transaction Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 text-sm font-medium outline-none"
            >
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Load Button */}
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-bold uppercase tracking-wider text-transparent mb-2 hidden md:block">&nbsp;</label>
            <button 
              onClick={() => handleItemSelect(selectedItemCode)}
              className="w-full py-2.5 px-4 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-bold transition-colors shadow-sm shadow-sky-200 whitespace-nowrap"
            >
              Track Item
            </button>
          </div>
          
        </div>
      </div>

      {/* Item Information & Summary Cards */}
      {selectedItemCode && (
        <>
          {selectedItemDetails && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex items-center gap-4">
              <div className="p-3 bg-sky-50 rounded-lg">
                <Box size={24} className="text-sky-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">{selectedItemDetails.ItemName || selectedItemDetails.description || 'Unknown Item'}</h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 font-medium">
                  <span className="flex items-center gap-1"><Hash size={14} /> {selectedItemCode}</span>
                  {selectedItemDetails.brand && <span className="flex items-center gap-1"><Filter size={14} /> {selectedItemDetails.brand}</span>}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Current Stock */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-sky-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Current Stock</span>
                <Box size={18} className="text-sky-500" />
              </div>
              <p className={`text-2xl font-black ${summary.currentStock < 0 ? 'text-rose-600' : summary.currentStock === 0 ? 'text-slate-400' : 'text-slate-800'}`}>
                {summary.currentStock ?? 0}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Purchased − Sold</p>
            </div>
            
            {/* Total Purchased */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Total Purchased</span>
                <TrendingUp size={18} className="text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-600">{summary.totalPurchased ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">From purchase records</p>
            </div>
            
            {/* Total Sold */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-rose-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Total Sold</span>
                <TrendingDown size={18} className="text-rose-500" />
              </div>
              <p className="text-2xl font-black text-rose-600">{summary.totalSold ?? 0}</p>
              {summary.totalPendingOrders > 0 && (
                <p className="text-[10px] text-amber-500 mt-1 font-semibold">+ {summary.totalPendingOrders} pending orders</p>
              )}
            </div>

            {/* Last Transaction */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Last Transaction</span>
                <Clock size={18} className="text-amber-500" />
              </div>
              <p className="text-lg font-black text-slate-800 mt-1">
                {summary.lastTransactionDate ? format(new Date(summary.lastTransactionDate), 'dd MMM yyyy') : '-'}
              </p>
            </div>
          </div>

          {/* Timeline / Data Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="w-full text-center text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
                    <th className="px-6 py-4 text-center">Date</th>
                    <th className="px-6 py-4 text-center">Type</th>
                    <th className="px-6 py-4 text-center">Party</th>
                    <th className="px-6 py-4 text-center">Qty</th>
                    <th className="px-6 py-4 text-center">Remarks/Ref</th>
                  </tr>
                </thead>
                 <tbody className="divide-y divide-slate-100">
                  {history.length > 0 ? (
                    history.map((tx, idx) => {
                      const typeL = (tx.type || '').toLowerCase();
                      const badgeColor = typeL === 'purchase' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : typeL === 'purchase order' ? 'bg-teal-100 text-teal-700 border border-teal-200'
                        : typeL === 'purchase return' ? 'bg-orange-100 text-orange-700 border border-orange-200'
                        : (typeL === 'sales invoice' || typeL === 'invoice') ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : (typeL === 'sales order' || typeL === 'quotation') ? 'bg-pink-100 text-pink-700 border border-pink-200'
                        : typeL === 'sales return' ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-sky-100 text-sky-700 border border-sky-200';
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3 whitespace-nowrap text-slate-600 font-medium text-center">
                            {tx.date ? format(new Date(tx.date), 'dd-MMM-yyyy') : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeColor}`}>
                              {tx.type || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="font-semibold text-slate-800 text-sm">{tx.vendorName || '-'}</div>
                            {tx.itemName && <div className="text-slate-400 text-xs mt-0.5 truncate max-w-[180px] mx-auto">{tx.itemName}</div>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-bold text-slate-800 text-sm">
                              {tx.qty !== undefined && tx.qty !== null ? tx.qty : 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sky-600 font-semibold text-xs bg-sky-50 px-2 py-1 rounded">
                              {tx.remarks || '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <PackageSearch size={32} className="text-slate-300" />
                          <p className="font-medium">No transactions found for this item with current filters.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty State before selection */}
      {!selectedItemCode && (
        <div className="mt-12 flex flex-col items-center justify-center text-slate-400">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <PackageSearch size={40} className="text-slate-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-600 mb-2">Track Item History</h2>
          <p className="text-sm font-medium text-center max-w-md">
            Search and select an item code above to view its complete chronological transaction history, stock movements, and export detailed audit reports.
          </p>
        </div>
      )}

    </div>
  );
}
