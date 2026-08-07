import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import DragScrollTable from './DragScrollTable';

/**
 * DataTable Component
 * Standardized table with Desktop Table View and Mobile Card View.
 * Includes integrated pagination footer.
 */
const DataTable = ({ 
  headers, 
  data, 
  renderRow, 
  renderCard,
  minWidth = "1000px",
  // Pagination Props
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  totalResults,
  itemsPerPageOptions = [10, 15, 20, 50, 100],
  hidePagination = false
}) => {
  const [visibleCols, setVisibleCols] = useState(() => headers.map(() => true));
  const [showColSelector, setShowColSelector] = useState(false);
  const colSelectorRef = useRef(null);

  // Only reset visibleCols when the NUMBER of columns changes (not on every render).
  // Using headers as a dep causes a reset every render because headers contains JSX
  // elements (e.g. a checkbox) which create a new array reference each time.
  const headerCount = headers.length;
  useEffect(() => {
    setVisibleCols(prev => {
      if (prev.length === headerCount) return prev; // no change needed
      return Array(headerCount).fill(true);
    });
  }, [headerCount]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (colSelectorRef.current && !colSelectorRef.current.contains(e.target)) {
        setShowColSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCol = (index) => {
    const newCols = [...visibleCols];
    newCols[index] = !newCols[index];
    // Prevent hiding all columns
    if (newCols.some(Boolean)) {
      setVisibleCols(newCols);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white relative">
      {/* Mobile Card View (Hidden on Desktop) */}
      <div className="md:hidden flex flex-col gap-3 p-3 overflow-y-auto flex-1 bg-slate-50/50 scrollbar-hide">
        {data.length > 0 ? (
          data.map((item, index) => renderCard(item, index))
        ) : (
          <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-gray-100 shadow-sm text-xs font-medium">
            No records found.
          </div>
        )}
      </div>

      {/* Desktop Table View (Hidden on Mobile) */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-hidden relative">
        {/* Table Toolbar / Column Selector */}
        <div className="flex justify-end px-4 py-2 border-b border-slate-100 bg-slate-50/30">
          <div className="relative" ref={colSelectorRef}>
            <button
              onClick={() => setShowColSelector(!showColSelector)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-black text-slate-800 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
            >
              <BarChart2 size={16} className="text-sky-600" />
              Cols
              {showColSelector ? <ChevronUp size={14} className="text-slate-500 ml-1" /> : <ChevronDown size={14} className="text-slate-500 ml-1" />}
            </button>
            
            {showColSelector && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-150 z-50 p-2 py-3 flex flex-col max-h-[350px] overflow-y-auto">
                {headers.map((header, index) => {
                  // If the header is a React element (e.g. checkbox), show a fallback label
                  const label = typeof header === 'string' || typeof header === 'number'
                    ? header
                    : `Col ${index + 1}`;
                  return (
                    <label key={index} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                      <input 
                        type="checkbox" 
                        checked={visibleCols[index] ?? true} 
                        onChange={() => toggleCol(index)}
                        className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wide group-hover:text-slate-900">{label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DragScrollTable className="w-full flex-1 min-h-0">
          <table 
            className="w-full relative border-collapse"
            style={{ minWidth }}
          >
            <thead className="bg-slate-50/80 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
              <tr>
                {headers.map((header, index) => visibleCols[index] && (
                  <th 
                    key={index} 
                    className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 whitespace-nowrap uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.map((item, index) => {
                const rowElement = renderRow(item, index);
                if (!React.isValidElement(rowElement)) return rowElement;
                
                // Filter the td elements based on visibleCols
                const childrenArray = React.Children.toArray(rowElement.props.children);
                const filteredChildren = childrenArray.filter((_, i) => {
                   return i < visibleCols.length ? visibleCols[i] : true;
                });
                
                return React.cloneElement(rowElement, {}, filteredChildren);
              })}
            </tbody>
          </table>
        </DragScrollTable>
      </div>

      {/* Footer - Unified for both views */}
      {!hidePagination && (
        <div className="px-4 py-3 border-t border-slate-150 bg-slate-50/50 flex items-center justify-between gap-4 rounded-b-lg">
          {/* Left Side: Row Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 bg-white font-medium text-xs md:text-sm shadow-sm transition-all"
            >
              {itemsPerPageOptions.map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
            <span className="text-[11px] md:text-xs text-slate-500 whitespace-nowrap font-medium hidden sm:inline">
              {totalResults > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}-{Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults}
            </span>
          </div>

          {/* Right Side: Pagination Controls */}
          <div className="flex items-center gap-2 md:gap-4 text-slate-700">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 md:px-2.5 md:py-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition shadow-sm flex items-center justify-center text-sky-600 active:scale-95"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <div className="flex items-center text-xs md:text-sm font-bold text-slate-600">
              {currentPage} / {totalPages || 1}
            </div>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 md:px-2.5 md:py-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition shadow-sm flex items-center justify-center text-sky-600 active:scale-95"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;

