import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Search, RotateCcw, Box, Eye, Filter, RefreshCw, Layers, CheckCircle, Package, Printer, Download, FileText, X, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import DataTable from '../../components/DataTable';
import SearchableDropdown from '../../components/SearchableDropdown';
import ModalView from '../../components/ModalView';
import useDataStore from '../../store/dataStore';

export default function Dasboard() {
  const { items, isLoading, error, fetchItems, transactions, fetchTransactions, inventorySummary, fetchInventorySummary } = useDataStore();

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Export State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportSelectedBrand, setExportSelectedBrand] = useState('All Brands');
  const [exportActionType, setExportActionType] = useState('PDF');
  const [exportOrientation, setExportOrientation] = useState('landscape');
  const [selectedItemCodes, setSelectedItemCodes] = useState([]);
  const [exportRange, setExportRange] = useState('all'); // 'all' | 'selected'
  const [modalSearchQuery, setModalSearchQuery] = useState('');

  // Filters State
  const [filters, setFilters] = useState({
    searchQuery: '',
    brand: '',
    stockLevel: '' // 'Stock Full' | 'Stock Low' | ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(200);

  // Fetch items on mount
  useEffect(() => {
    fetchItems(true);
    fetchTransactions();
    fetchInventorySummary();
  }, [fetchItems, fetchTransactions, fetchInventorySummary]);

  const handleClearFilters = () => {
    setFilters({
      searchQuery: '',
      brand: '',
      stockLevel: ''
    });
    setCurrentPage(1);
    toast.success('Filters cleared');
  };

  // Compile active brands for filtering dropdowns

  const brandsList = useMemo(() => {
    return Array.from(new Set(items.map(i => i.BrandName || i.brand))).filter(Boolean).sort();
  }, [items]);

  // Compute live stock summary metrics crossing master items catalog with inventorySummary
  const computedStocks = useMemo(() => {
    // Build a lookup map to avoid O(N*M) loops
    const summaryMap = {};
    inventorySummary.forEach(s => {
      if (s.item_code) {
        summaryMap[s.item_code.toString().trim().toLowerCase()] = s;
      }
    });

    return items.map(item => {
      const code = (item.ItemCode || item.code || '').toString().trim().toLowerCase();
      const summary = summaryMap[code] || {};

      const openingQty = Number((summary.opening_qty || 0).toFixed(1));
      const purchaseQty = Number((summary.purchase_qty || 0).toFixed(1));
      const salesQty = Number((summary.sales_qty || 0).toFixed(1));
      const purchaseReturnQty = Number((summary.purchase_return_qty || 0).toFixed(1));
      const salesReturnQty = Number((summary.sales_return_qty || 0).toFixed(1));

      const currentQty = Number(((item.StockQty || 0) + (summary.closing_qty || 0)).toFixed(1));
      const stockLevel = currentQty >= 50 ? 'Stock Full' : 'Stock Low';

      return {
        ...item,
        openingQty,
        purchaseQty,
        salesQty,
        purchaseReturnQty,
        salesReturnQty,
        currentQty,
        stockLevel
      };
    });
  }, [items, inventorySummary]);

  // Apply filters
  const filteredStocks = useMemo(() => {
    return computedStocks.filter(item => {
      const brnd = item.BrandName || item.brand || '';
      const name = item.ItemName || item.name || '';
      const code = item.ItemCode || item.code || '';

      if (filters.brand && brnd !== filters.brand) return false;
      if (filters.stockLevel && item.stockLevel !== filters.stockLevel) return false;

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
  }, [computedStocks, filters]);

  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);
  const paginatedStocks = filteredStocks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = useMemo(() => {
    const totalItems = items.length;
    const lowStockAlerts = computedStocks.filter(item => item.currentQty < 50).length;
    const pendingIndents = transactions.filter(t => t.status === 'Pending').length;
    const completedIndents = transactions.filter(t => t.status === 'Completed').length;

    return {
      totalItems,
      lowStockAlerts,
      pendingIndents,
      completedIndents
    };
  }, [items, computedStocks, transactions]);

  const modalSearchResults = useMemo(() => {
    if (!modalSearchQuery.trim()) return [];
    const q = modalSearchQuery.toLowerCase();
    return computedStocks.filter(item => {
      const code = (item.ItemCode || item.code || '').toLowerCase();
      const name = (item.ItemName || item.name || '').toLowerCase();
      const brand = (item.BrandName || item.brand || '').toLowerCase();
      return code.includes(q) || name.includes(q) || brand.includes(q);
    }).slice(0, 15);
  }, [computedStocks, modalSearchQuery]);

  const openExportModal = (type) => {
    setExportActionType(type);
    if (selectedItemCodes.length > 0) {
      setExportRange('selected');
    } else {
      setExportRange('filtered');
    }
    setModalSearchQuery('');
    setIsExportModalOpen(true);
  };

  const handleExportSubmit = async () => {
    // Determine data to export
    let dataToExport = [];
    if (exportRange === 'selected') {
      dataToExport = computedStocks.filter(item => selectedItemCodes.includes(item.ItemCode || item.code));
    } else if (exportRange === 'filtered') {
      if (exportSelectedBrand !== 'All Brands') {
        dataToExport = filteredStocks.filter(item => (item.BrandName || item.brand) === exportSelectedBrand);
      } else {
        dataToExport = filteredStocks;
      }
    } else { // 'all' - Complete Catalog
      if (exportSelectedBrand !== 'All Brands') {
        dataToExport = computedStocks.filter(item => (item.BrandName || item.brand) === exportSelectedBrand);
      } else {
        dataToExport = computedStocks;
      }
    }

    if (dataToExport.length === 0) {
      toast.error(
        exportRange === 'selected' 
          ? 'No selected items found' 
          : exportRange === 'filtered' 
            ? 'No items found in filtered view' 
            : 'No inventory items found'
      );
      return;
    }

    if (exportActionType === 'Excel') {
      exportToExcel(dataToExport);
      setIsExportModalOpen(false);
    } else {
      const toastId = toast.loading(
        dataToExport.length > 200 
          ? `Generating PDF with ${dataToExport.length} items (Text-Only to optimize)...` 
          : 'Generating PDF with images...'
      );
      try {
        await exportToPdf(dataToExport, exportActionType === 'Print', exportOrientation);
        toast.success('PDF generated successfully', { id: toastId });
        setIsExportModalOpen(false);
      } catch (err) {
        console.error('PDF generation error:', err);
        toast.error('Failed to generate PDF', { id: toastId });
      }
    }
  };

  const exportToExcel = (data) => {
    const exportData = data.map((item, idx) => ({
      'Serial No': idx + 1,
      'Item Code': item.ItemCode || item.code || '',
      'Item Name': item.ItemName || item.name || '',
      'Brand': item.BrandName || item.brand || '',
      'Unit Price / MRP': Number(item.MRP || 0),
      'Opening Quantity': item.openingQty || 0,
      'Purchase Quantity': item.purchaseQty || 0,
      'Sales Quantity': item.salesQty || 0,
      'Current Stock': item.currentQty || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
    
    // Auto-adjust column widths
    const wscols = Object.keys(exportData[0] || {}).map(() => ({ wch: 15 }));
    wscols[2] = { wch: 45 }; // Item name wider
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `Brand_Wise_Inventory_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
    toast.success('Excel downloaded successfully');
  };

  const exportToPdf = async (data, isPrint = false, orientation = 'landscape') => {
    // Helper to convert Image URL to Base64 data URI
    const loadImageBase64 = (url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        // If it's a web URL (http/https), route it through a public CORS-enabled image proxy
        if (url.startsWith('http://') || url.startsWith('https://')) {
          img.src = `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
        } else {
          img.src = url;
        }

        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          try {
            const dataURL = canvas.toDataURL('image/jpeg', 0.75); // compress to reduce PDF size
            resolve(dataURL);
          } catch (e) {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
      });
    };

    // Determine whether to load images (limit to <= 200 items to avoid out-of-memory or browser freezing)
    const shouldLoadImages = data.length <= 200;

    const itemsWithImages = shouldLoadImages
      ? await Promise.all(
          data.map(async (item) => {
            const imgUrl = item.Thumbnail || item.product_image_url || '';
            let base64 = null;
            if (imgUrl) {
              if (imgUrl.startsWith('data:image/')) {
                base64 = imgUrl;
              } else {
                base64 = await loadImageBase64(imgUrl);
              }
            }
            return { ...item, imageBase64: base64 };
          })
        )
      : data.map(item => ({ ...item, imageBase64: null }));

    const doc = new jsPDF(orientation === 'landscape' ? 'l' : 'p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // slate-900
    
    let reportTitle = 'Brand Wise Inventory Report';
    if (exportRange === 'selected') reportTitle = 'Selected Inventory Report';
    else if (exportRange === 'filtered') reportTitle = 'Filtered Inventory Report';
    
    doc.text(reportTitle, 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`Company: PAREKH GALLERIUM`, 14, 28);
    
    doc.setFont('helvetica', 'normal');
    let scopeText = 'Complete Inventory';
    if (exportRange === 'selected') scopeText = 'Selected Products Only';
    else if (exportRange === 'filtered') scopeText = 'Filtered View';
    
    doc.text(`Export Scope: ${scopeText} | Brand: ${exportSelectedBrand}`, 14, 34);
    doc.text(`Total Products: ${data.length}`, 14, 40);

    doc.text(`Report Date: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`, pageWidth - 14, 28, { align: 'right' });

    // Separator line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(14, 43, pageWidth - 14, 43);

    // Table Data
    const tableColumn = ["SN", "Image", "Item Code", "Item Name", "Brand", "MRP", "Op. Qty", "Pur. Qty", "Sal. Qty", "Cur. Stock"];
    const tableRows = itemsWithImages.map((item, idx) => [
      idx + 1,
      '', // Placeholder for image
      item.ItemCode || item.code || '',
      item.ItemName || item.name || '',
      item.BrandName || item.brand || '',
      `Rs ${Number(item.MRP || 0).toLocaleString('en-IN')}`,
      item.openingQty || 0,
      item.purchaseQty || 0,
      item.salesQty || 0,
      item.currentQty || 0
    ]);

    autoTable(doc, {
      startY: 48,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: orientation === 'landscape' ? 9 : 7.5,
        cellPadding: orientation === 'landscape' ? 2.5 : 2,
        overflow: 'ellipsize', // Force text to single line with ellipsis
        font: 'helvetica',
        lineColor: [226, 232, 240], // slate-200
        lineWidth: 0.1,
        valign: 'middle' // vertically center contents
      },
      headStyles: {
        fillColor: [14, 165, 233], // sky-500
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      bodyStyles: {
        minCellHeight: orientation === 'landscape' ? 20 : 16 // ensure adequate row height for larger images
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // slate-50
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: orientation === 'landscape' ? 8 : 7 },
        1: { halign: 'center', cellWidth: orientation === 'landscape' ? 22 : 18 }, // Image
        2: { halign: 'center', cellWidth: orientation === 'landscape' ? 35 : 25, fontStyle: 'bold' }, // Item Code
        3: { halign: 'left', cellWidth: 'auto' }, // Item name
        4: { halign: 'center', cellWidth: orientation === 'landscape' ? 22 : 18 }, // Brand
        5: { halign: 'right', cellWidth: orientation === 'landscape' ? 22 : 18 }, // MRP
        6: { halign: 'center', cellWidth: orientation === 'landscape' ? 16 : 12 }, // Op Qty
        7: { halign: 'center', cellWidth: orientation === 'landscape' ? 16 : 12, textColor: [5, 150, 105] }, // Pur Qty
        8: { halign: 'center', cellWidth: orientation === 'landscape' ? 16 : 12, textColor: [225, 29, 72] }, // Sal Qty
        9: { halign: 'center', cellWidth: orientation === 'landscape' ? 16 : 12, fontStyle: 'bold', textColor: [2, 132, 199] }, // Cur Stock
      },
      didDrawCell: function (cellData) {
        // Draw the image if it is the image column (index 1) in the body section
        if (cellData.section === 'body' && cellData.column.index === 1) {
          const item = itemsWithImages[cellData.row.index];
          if (item && item.imageBase64) {
            const cellWidth = cellData.cell.width;
            const cellHeight = cellData.cell.height;
            const imgSize = Math.min(cellWidth, cellHeight) - 2; // slight padding
            const x = cellData.cell.x + (cellWidth - imgSize) / 2;
            const y = cellData.cell.y + (cellHeight - imgSize) / 2;
            try {
              const match = item.imageBase64.match(/^data:image\/([a-zA-Z+]+);base64,/);
              let format = 'JPEG';
              if (match && match[1]) {
                format = match[1].toUpperCase() === 'JPG' ? 'JPEG' : match[1].toUpperCase();
              }
              doc.addImage(item.imageBase64, format, x, y, imgSize, imgSize);
            } catch (err) {
              console.error('Error drawing image inside PDF table:', err);
            }
          }
        }
      },
      didDrawPage: function (pageData) {
        // Footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184); // slate-400
        const pageNumberStr = `Page ${doc.internal.getNumberOfPages()}`;
        doc.text(pageNumberStr, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }
    });

    if (isPrint) {
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`Brand_Wise_Inventory_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
    }
  };

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const isAllSelectedOnCurrentPage = paginatedStocks.length > 0 && paginatedStocks.every(item => selectedItemCodes.includes(item.ItemCode || item.code));

  const tableHeaders = [
    <input 
      type="checkbox" 
      checked={isAllSelectedOnCurrentPage}
      onChange={(e) => {
        const pageCodes = paginatedStocks.map(item => item.ItemCode || item.code);
        if (e.target.checked) {
          setSelectedItemCodes(prev => Array.from(new Set([...prev, ...pageCodes])));
        } else {
          setSelectedItemCodes(prev => prev.filter(c => !pageCodes.includes(c)));
        }
      }}
      onClick={(e) => e.stopPropagation()}
      className="rounded border-slate-350 text-sky-600 focus:ring-sky-500 cursor-pointer w-4 h-4"
    />,
    "Serial No", "Image", "Item Code", "Item Name", "Brand", "Unit Price / MRP", 
    "Opening Qty", "Purchase Qty", "Sales Qty", "Purchase Return Qty", "Sales Return Qty", "Current Qty", "Stock Level"
  ];

  const renderRow = (item, idx) => {
    const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
    const isFull = item.stockLevel === 'Stock Full';
    const priceVal = Number(item.MRP || 0);

    return (
      <tr key={item.ItmID || item.ItemCode} onClick={() => handleRowClick(item)} className="hover:bg-sky-50/50 transition-colors border-b border-slate-100 cursor-pointer">
        <td className="px-4 py-3 text-center w-[50px]" onClick={(e) => e.stopPropagation()}>
          <input 
            type="checkbox" 
            checked={selectedItemCodes.includes(item.ItemCode || item.code)}
            onChange={(e) => {
              const code = item.ItemCode || item.code;
              if (e.target.checked) {
                setSelectedItemCodes(prev => [...prev, code]);
              } else {
                setSelectedItemCodes(prev => prev.filter(c => c !== code));
              }
            }}
            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer w-4 h-4"
          />
        </td>
        <td className="px-4 py-3 text-center text-xs text-slate-500 whitespace-nowrap w-[80px]">{globalIdx}</td>
        <td className="px-4 py-3 text-center w-[60px]">
          {item.Thumbnail ? (
            <img src={item.Thumbnail} alt={item.ItemName} className="w-9 h-9 rounded-lg object-cover border border-slate-200 mx-auto bg-slate-50" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Box size={14} />
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-center text-xs text-slate-900 font-bold whitespace-nowrap w-[150px]">{item.ItemCode}</td>
        <td className="px-4 py-3 text-left text-xs font-semibold text-slate-900 whitespace-normal uppercase min-w-[350px] max-w-[450px]">{item.ItemName}</td>
        <td className="px-4 py-3 text-center text-[11px] text-slate-600 whitespace-nowrap">{item.BrandName}</td>
        <td className="px-4 py-3 text-center text-xs text-slate-700 font-medium whitespace-nowrap">₹{priceVal.toLocaleString('en-IN')}</td>
        <td className="px-4 py-3 text-center text-[15px] text-slate-500 font-bold whitespace-nowrap">{item.openingQty}</td>
        <td className="px-4 py-3 text-center text-[15px] text-emerald-600 font-bold whitespace-nowrap">+{item.purchaseQty}</td>
        <td className="px-4 py-3 text-center text-[15px] text-rose-600 font-bold whitespace-nowrap">-{item.salesQty}</td>
        <td className="px-4 py-3 text-center text-[15px] text-amber-600 font-bold whitespace-nowrap">-{item.purchaseReturnQty}</td>
        <td className="px-4 py-3 text-center text-[15px] text-emerald-500 font-bold whitespace-nowrap">+{item.salesReturnQty}</td>
        <td className="px-4 py-3 text-center text-[16px] text-sky-600 font-black whitespace-nowrap bg-sky-50/25">{item.currentQty}</td>
        <td className="px-4 py-3 text-center whitespace-nowrap text-xs">
          <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-black tracking-wider ${
            isFull ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}>
            {item.stockLevel}
          </span>
        </td>
      </tr>
    );
  };

  const renderCard = (item, idx) => {
    const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
    const isFull = item.stockLevel === 'Stock Full';
    const priceVal = Number(item.MRP || 0);

    const code = item.ItemCode || item.code;
    return (
      <div key={item.ItmID || item.ItemCode} onClick={() => handleRowClick(item)} className="bg-white rounded-lg border border-slate-100 shadow-sm p-3 space-y-2.5 transition-all hover:shadow-md hover:border-sky-100 cursor-pointer">
        <div className="flex justify-between items-start pb-2 border-b border-slate-50 gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-shrink-0 mr-1" onClick={(e) => e.stopPropagation()}>
              <input 
                type="checkbox" 
                checked={selectedItemCodes.includes(code)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedItemCodes(prev => [...prev, code]);
                  } else {
                    setSelectedItemCodes(prev => prev.filter(c => c !== code));
                  }
                }}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer w-4 h-4"
              />
            </div>
            <span className="w-5 h-5 mt-0.5 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 flex-shrink-0">
              {globalIdx}
            </span>
            {item.Thumbnail ? (
              <img src={item.Thumbnail} alt={item.ItemName} className="w-7 h-7 rounded object-cover border border-slate-200 bg-slate-50 flex-shrink-0 mt-0.5" />
            ) : (
              <div className="w-7 h-7 rounded bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0 mt-0.5">
                <Box size={12} />
              </div>
            )}
            <span className="text-xs font-bold text-slate-900 uppercase break-words whitespace-normal leading-tight ml-1">{item.ItemName}</span>
          </div>
          <span className="bg-slate-50 text-slate-800 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-black uppercase flex-shrink-0 mt-0.5">
            {item.ItemCode}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 rounded-md p-2 border border-slate-100/50">
          <div>
            <span className="text-slate-400 block uppercase text-[9px] tracking-tight mb-0.5">Brand</span>
            <span className="text-slate-800 font-semibold break-words whitespace-normal block leading-tight">{item.BrandName}</span>
          </div>
          <div>
            <span className="text-slate-400 block uppercase text-[9px] tracking-tight mb-0.5">Unit Price</span>
            <span className="text-slate-800 font-semibold">₹{priceVal.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-slate-400 block uppercase text-[9px] tracking-tight mb-0.5">Opening Qty</span>
            <span className="text-slate-800 font-bold">{item.openingQty}</span>
          </div>
          <div>
            <span className="text-slate-400 block uppercase text-[9px] tracking-tight mb-0.5">Current Qty</span>
            <span className="text-sky-600 font-bold text-sm">{item.currentQty}</span>
          </div>
          <div>
            <span className="text-slate-400 block uppercase text-[9px] tracking-tight mb-0.5">Purchase / Sales</span>
            <span className="text-slate-800 font-semibold"><span className="text-emerald-600 font-bold">+{item.purchaseQty}</span> / <span className="text-rose-600 font-bold">-{item.salesQty}</span></span>
          </div>
          <div>
            <span className="text-slate-400 block uppercase text-[9px] tracking-tight mb-0.5">Pur. Ret / Sal. Ret</span>
            <span className="text-slate-800 font-semibold"><span className="text-amber-600 font-bold">-{item.purchaseReturnQty}</span> / <span className="text-emerald-500 font-bold">+{item.salesReturnQty}</span></span>
          </div>
        </div>

        <div className="flex justify-end items-center border-t border-slate-100 pt-2 text-xs">
          <span className={`px-2 py-1 rounded text-[9px] uppercase font-black ${
            isFull ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}>
            {item.stockLevel}
          </span>
        </div>
      </div>
    );
  };

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
      
      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 px-2 sm:px-0">
        
        {/* Total Registered Products */}
        <div className="bg-white rounded-xl border border-slate-100 p-3 md:p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
          <div className="space-y-0.5">
            <span className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider block">Total Products</span>
            <span className="text-lg md:text-2xl font-black text-slate-800 tracking-tight">{stats.totalItems}</span>
          </div>
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
            <Box size={18} className="md:w-5 md:h-5" />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl border border-slate-100 p-3 md:p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
          <div className="space-y-0.5">
            <span className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider block">Low Stock Alerts</span>
            <span className="text-lg md:text-2xl font-black text-slate-800 tracking-tight">{stats.lowStockAlerts}</span>
          </div>
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <Package size={18} className={`md:w-5 md:h-5 ${stats.lowStockAlerts > 0 ? 'animate-pulse' : ''}`} />
          </div>
        </div>


      </div>

      {/* Divider */}
      <div className="border-b border-slate-100 mx-2 sm:mx-0"></div>

      {/* Filters & Actions Toolbar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-4 w-full px-2 sm:px-0">
        
        {/* Action Buttons (Export/Print) */}
        <div className="flex gap-2 w-full lg:w-auto order-2 lg:order-1 justify-end lg:justify-start">
          <button
            onClick={() => openExportModal('PDF')}
            className="flex flex-1 lg:flex-none items-center justify-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-xl px-3 py-2 text-xs md:text-sm font-semibold transition-colors shadow-sm"
            title="Export PDF"
          >
            <FileText size={16} /> <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => openExportModal('Excel')}
            className="flex flex-1 lg:flex-none items-center justify-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 rounded-xl px-3 py-2 text-xs md:text-sm font-semibold transition-colors shadow-sm"
            title="Export Excel"
          >
            <Download size={16} /> <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={() => openExportModal('Print')}
            className="flex flex-1 lg:flex-none items-center justify-center gap-1.5 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-xl px-3 py-2 text-xs md:text-sm font-semibold transition-colors shadow-sm"
            title="Print Report"
          >
            <Printer size={16} /> <span className="hidden sm:inline">Print</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row w-full lg:flex-[2] gap-2 lg:gap-3 items-center order-1 lg:order-2 justify-end">
          
          {/* Search items box */}
          <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-3 top-[12px] text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search stock catalog..."
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

            {/* Stock Level Alert Dropdown */}
            <div className="flex-1 min-w-0 lg:min-w-[160px]">
              <SearchableDropdown
                options={[
                  { value: 'Stock Full', label: 'Stock Full (Green)' },
                  { value: 'Stock Low', label: 'Stock Low (Red)' }
                ]}
                value={filters.stockLevel}
                onChange={(val) => setFilters({ ...filters, stockLevel: val })}
                placeholder="All Stock Levels"
                className="h-[38px]"
                height="h-[38px]"
                rounded="rounded-xl"
              />
            </div>

            {/* Pagination Dropdown */}
            <div className="flex-1 min-w-0 lg:min-w-[130px]">
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-xs md:text-sm h-[38px] transition-all outline-none font-medium text-slate-600"
              >
                {[200, 400, 600, 800, 1000].map(val => (
                  <option key={val} value={val}>{val} / page</option>
                ))}
              </select>
            </div>

            {/* Pagination Arrows */}
            <div className="hidden lg:flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center justify-center bg-white text-slate-600 border border-slate-200 rounded-xl w-[38px] h-[38px] hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                &lt;
              </button>
              <span className="text-xs font-bold text-slate-600 w-12 text-center">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages || 1, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="flex items-center justify-center bg-white text-slate-600 border border-slate-200 rounded-xl w-[38px] h-[38px] hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                &gt;
              </button>
            </div>

            <button
              onClick={handleClearFilters}
              className="hidden lg:flex items-center justify-center bg-slate-50 text-slate-500 border border-slate-200 rounded-xl w-[38px] h-[38px] hover:bg-slate-150 transition-colors shadow-sm"
              title="Clear Filters"
            >
              <RotateCcw size={16} />
            </button>

          </div>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          renderSkeletons()
        ) : error ? (
          <div className="p-12 text-center space-y-4">
            <p className="text-red-500 font-semibold">{error}</p>
            <button
              onClick={() => fetchItems(true)}
              className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
            >
              Retry Loading
            </button>
          </div>
        ) : (
          <DataTable
            headers={tableHeaders}
            data={paginatedStocks}
            renderRow={renderRow}
            renderCard={renderCard}
            minWidth="1400px"
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
            totalResults={filteredStocks.length}
            itemsPerPageOptions={[200, 400, 600, 800, 1000]}
            hidePagination={true}
          />
        )}
      </div>

      {/* Item Details Drawer/Modal */}
      {selectedItem && (
        <ModalView
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Product Specifications: ${selectedItem.ItemCode}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            {/* Header info */}
            <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase">{selectedItem.ItemName}</h3>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">{selectedItem.Category} &bull; {selectedItem.BrandName}</span>
              </div>
              <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-100 text-xs font-bold rounded">
                ID: {selectedItem.ItmID}
              </span>
            </div>

            {/* Grid specifications */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 space-y-1">
                <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-semibold">Brand / Category</span>
                <span className="text-gray-800 font-bold">{selectedItem.BrandName || '-'} / {selectedItem.Category || '-'}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 space-y-1">
                <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-semibold">UOM / Unit Size</span>
                <span className="text-gray-800 font-bold">{selectedItem.UOM || 'PCS'} / {selectedItem.Size || 'Standard'}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 space-y-1">
                <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-semibold">Color / Weight</span>
                <span className="text-gray-800 font-bold">{selectedItem.Color || 'N/A'} / {selectedItem.Weight ? `${selectedItem.Weight} kg` : '-'}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 space-y-1">
                <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-semibold">HSN Code / Packing</span>
                <span className="text-gray-800 font-bold">{selectedItem.HSNCode || '-'} / {selectedItem.Packing || '-'}</span>
              </div>
            </div>

            {/* Inventory Levels */}
            <div className="border-t border-gray-100 pt-3">
              <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2">Live Inventory Balance</h4>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-emerald-50/50 border border-emerald-100 p-2 rounded">
                  <span className="text-[8px] uppercase text-emerald-600 font-bold block">Available Stock</span>
                  <span className="text-sm font-black text-emerald-700">{(selectedItem.currentQty || 0) - (selectedItem.ReservedQty || 0) - (selectedItem.DisplayQty || 0)}</span>
                </div>
                <div className="bg-blue-50/50 border border-blue-100 p-2 rounded">
                  <span className="text-[8px] uppercase text-blue-600 font-bold block">Reserved Qty</span>
                  <span className="text-sm font-black text-blue-700">{selectedItem.ReservedQty || 0}</span>
                </div>
                <div className="bg-amber-50/50 border border-amber-100 p-2 rounded">
                  <span className="text-[8px] uppercase text-amber-600 font-bold block">Display Qty</span>
                  <span className="text-sm font-black text-amber-700">{selectedItem.DisplayQty || 0}</span>
                </div>
                <div className="bg-sky-50/50 border border-sky-100 p-2 rounded">
                  <span className="text-[8px] uppercase text-sky-600 font-bold block">Current Stock</span>
                  <span className="text-sm font-black text-sky-700">{selectedItem.currentQty || 0}</span>
                </div>
              </div>
            </div>

            {/* Pricing details */}
            <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-semibold">Retail Unit MRP</span>
                <span className="text-lg font-black text-slate-800">₹{(selectedItem.MRP || 0).toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-semibold">Total Stock Valuation</span>
                <span className="text-lg font-black text-emerald-600">₹{((selectedItem.currentQty || 0) * (selectedItem.MRP || 0)).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Notes */}
            {selectedItem.Notes && (
              <div className="border-t border-gray-100 pt-3">
                <span className="text-[10px] text-gray-400 block uppercase font-semibold">Notes / Details</span>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
                  {selectedItem.Notes}
                </p>
              </div>
            )}
          </div>
        </ModalView>
      )}

      {/* Export Modal Overlay */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {exportActionType === 'Excel' ? <Download className="text-emerald-500" size={20} /> :
                 exportActionType === 'PDF' ? <FileText className="text-rose-500" size={20} /> :
                 <Printer className="text-slate-600" size={20} />}
                Export {exportActionType} Options
              </h3>
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-1 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Export Range Selector */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Export Scope</label>
                <p className="text-xs text-slate-500 mb-3">Select the range of products you wish to export.</p>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border cursor-pointer transition-all ${exportRange === 'all' ? 'bg-sky-50 border-sky-500 text-sky-700 font-bold' : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50 font-semibold'}`}>
                    <input 
                      type="radio" 
                      name="exportRange" 
                      value="all" 
                      checked={exportRange === 'all'} 
                      onChange={() => setExportRange('all')} 
                      className="hidden"
                    />
                    <span className="text-[11px] sm:text-xs">Complete Catalog ({computedStocks.length})</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border cursor-pointer transition-all ${exportRange === 'filtered' ? 'bg-sky-50 border-sky-500 text-sky-700 font-bold' : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50 font-semibold'}`}>
                    <input 
                      type="radio" 
                      name="exportRange" 
                      value="filtered" 
                      checked={exportRange === 'filtered'} 
                      onChange={() => setExportRange('filtered')} 
                      className="hidden"
                    />
                    <span className="text-[11px] sm:text-xs">Filtered View ({filteredStocks.length})</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border cursor-pointer transition-all ${
                    exportRange === 'selected' ? 'bg-sky-50 border-sky-500 text-sky-700 font-bold' : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50 font-semibold'
                  }`}>
                    <input 
                      type="radio" 
                      name="exportRange" 
                      value="selected" 
                      checked={exportRange === 'selected'} 
                      onChange={() => setExportRange('selected')} 
                      className="hidden"
                    />
                    <span className="text-[11px] sm:text-xs">Selected ({selectedItemCodes.length})</span>
                  </label>
                </div>
              </div>

              {exportRange !== 'selected' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Select Brand Filter</label>
                  <p className="text-xs text-slate-500 mb-3">Choose a specific brand to export, or select 'All Brands' for a complete inventory report.</p>
                  <div className="relative">
                    <select
                      value={exportSelectedBrand}
                      onChange={(e) => setExportSelectedBrand(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 appearance-none cursor-pointer transition-all"
                    >
                      <option value="All Brands">📦 All Brands</option>
                      <optgroup label="Available Brands">
                        {brandsList.map(brand => (
                          <option key={brand} value={brand}>{brand}</option>
                        ))}
                      </optgroup>
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
              )}

              {exportRange === 'selected' && (
                <div className="space-y-3">
                  {/* Search box to add items in modal */}
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Search & Add Products</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-[12px] text-slate-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search code, name, or brand to add..."
                        value={modalSearchQuery}
                        onChange={(e) => setModalSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-xs md:text-sm h-[38px] transition-all outline-none"
                      />
                    </div>

                    {/* Autocomplete suggestions */}
                    {modalSearchResults.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] max-h-48 overflow-y-auto divide-y divide-slate-50">
                        {modalSearchResults.map(item => {
                          const code = item.ItemCode || item.code;
                          const name = item.ItemName || item.name;
                          const isAlreadySelected = selectedItemCodes.includes(code);
                          return (
                            <div
                              key={code}
                              onClick={() => {
                                if (!isAlreadySelected) {
                                  setSelectedItemCodes(prev => [...prev, code]);
                                }
                                setModalSearchQuery('');
                              }}
                              className={`px-3 py-2 cursor-pointer flex items-center justify-between text-xs transition-colors hover:bg-slate-50 ${isAlreadySelected ? 'bg-slate-50 opacity-60' : ''}`}
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-bold text-slate-800">{code}</span>
                                <span className="text-slate-500 block truncate font-medium">{name} ({item.BrandName || 'No Brand'})</span>
                              </div>
                              {isAlreadySelected ? (
                                <span className="text-emerald-600 font-bold flex-shrink-0">Added</span>
                              ) : (
                                <span className="text-sky-600 font-bold flex-shrink-0 hover:underline">+ Add</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected items checklist */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Currently Selected ({selectedItemCodes.length})</label>
                      {selectedItemCodes.length > 0 && (
                        <button
                          onClick={() => setSelectedItemCodes([])}
                          className="text-[10px] text-rose-500 hover:text-rose-700 font-bold uppercase hover:underline"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {selectedItemCodes.length > 0 ? (
                      <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                        {computedStocks
                          .filter(item => selectedItemCodes.includes(item.ItemCode || item.code))
                          .map(item => {
                            const code = item.ItemCode || item.code;
                            return (
                              <div key={code} className="px-3 py-1.5 flex items-center justify-between text-xs bg-white">
                                <div className="flex items-center gap-2.5 min-w-0 pr-4">
                                  <input
                                    type="checkbox"
                                    checked={true}
                                    onChange={() => setSelectedItemCodes(prev => prev.filter(c => c !== code))}
                                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer w-4 h-4"
                                  />
                                  <div className="truncate">
                                    <span className="font-bold text-slate-850">{code}</span>
                                    <span className="text-slate-500 text-[10px] block truncate">{item.ItemName || ''}</span>
                                  </div>
                                </div>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase flex-shrink-0">{item.BrandName || 'No Brand'}</span>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="text-center p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <p className="text-xs text-slate-400 font-medium">No items selected yet.</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Use the search bar above to add items, or select them from the main table.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {exportActionType !== 'Excel' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Page Orientation</label>
                  <div className="flex gap-3 mt-2">
                    <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border cursor-pointer transition-all ${exportOrientation === 'landscape' ? 'bg-sky-50 border-sky-500 text-sky-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold'}`}>
                      <input 
                        type="radio" 
                        name="orientation" 
                        value="landscape" 
                        checked={exportOrientation === 'landscape'} 
                        onChange={() => setExportOrientation('landscape')} 
                        className="hidden"
                      />
                      <span className="text-sm">Horizontal</span>
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border cursor-pointer transition-all ${exportOrientation === 'portrait' ? 'bg-sky-50 border-sky-500 text-sky-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold'}`}>
                      <input 
                        type="radio" 
                        name="orientation" 
                        value="portrait" 
                        checked={exportOrientation === 'portrait'} 
                        onChange={() => setExportOrientation('portrait')} 
                        className="hidden"
                      />
                      <span className="text-sm">Vertical</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="bg-sky-50 text-sky-800 p-3 rounded-lg text-xs font-medium border border-sky-100 flex items-start gap-2">
                <Filter size={16} className="mt-0.5 text-sky-600 flex-shrink-0" />
                <p>The exported report will also respect any other active dashboard filters (Search, Category, Stock Level).</p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExportSubmit}
                className={`px-5 py-2 text-sm font-bold text-white rounded-xl shadow-sm transition-all flex items-center gap-2 ${
                  exportActionType === 'Excel' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 
                  exportActionType === 'PDF' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 
                  'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20'
                }`}
              >
                {exportActionType === 'Excel' ? <Download size={16} /> :
                 exportActionType === 'PDF' ? <FileText size={16} /> :
                 <Printer size={16} />}
                Generate {exportActionType}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}