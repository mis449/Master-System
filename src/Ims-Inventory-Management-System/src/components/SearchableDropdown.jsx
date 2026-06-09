import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus, X } from 'lucide-react';

/**
 * SearchableDropdown Component
 * A custom select/autocomplete component with built-in search functionality in the main input.
 * 
 * @param {Array} options - Array of { value, label } objects.
 * @param {any} value - Currently selected value.
 * @param {Function} onChange - Callback function when an option is selected.
 * @param {string} placeholder - Text to show when no value is selected.
 * @param {string} className - Additional CSS classes for the container.
 */
const SearchableDropdown = ({ 
  options, 
  value, 
  onChange, 
  onAdd, 
  placeholder = "Search or select option...", 
  className = "",
  height = "h-[38px]",
  rounded = "rounded-xl",
  renderSelected
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [openUp, setOpenUp] = useState(false);
  const dropdownRef = useRef(null);

  // Keep search term in sync with selected value when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      const selectedOption = options.find(opt => opt.value === value);
      if (selectedOption) {
         setSearchTerm(selectedOption.value);
      } else {
         setSearchTerm("");
      }
    }
  }, [value, isOpen, options]);

  // Filter options based on search term
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    opt.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Determine direction based on space
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 300; // Estimated max height
      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        setOpenUp(true);
      } else {
        setOpenUp(false);
      }
    }
  }, [isOpen]);

  // Close dropdown when clicking/touching outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("touchstart", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("touchstart", handleClickOutside, true);
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Input Field instead of Button */}
      <div className={`relative flex items-center w-full bg-white border border-slate-200 ${rounded} hover:border-sky-500 transition-all ${height} shadow-sm group focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-500/10`}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full h-full bg-transparent outline-none px-3 text-xs md:text-sm placeholder-slate-400 ${value ? 'text-slate-800 font-semibold' : 'text-slate-700'}`}
        />
        <div className="flex items-center px-2 cursor-pointer text-slate-400 hover:text-slate-600 h-full" onClick={() => setIsOpen(!isOpen)}>
           {searchTerm ? (
             <X size={14} className="hover:text-slate-700" onClick={(e) => { 
               e.stopPropagation(); 
               setSearchTerm("");
               if (value) {
                 onChange("");
               }
             }} />
           ) : (
             <ChevronDown size={16} className={`transition-transform duration-200 group-hover:text-sky-500 ${isOpen ? 'rotate-180' : ''}`} />
           )}
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute left-0 right-0 ${openUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} bg-white border border-slate-200 rounded-xl shadow-xl z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-150 min-w-[200px]`}>
          
          {/* Options List */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(opt.value);
                    setSearchTerm(opt.value);
                    setIsOpen(false);
                  }}
                  className={`px-4 py-2 text-xs md:text-sm cursor-pointer flex justify-between items-center hover:bg-slate-50 transition-colors group ${value === opt.value
                      ? 'bg-sky-50/70 text-sky-700 font-bold'
                      : 'text-slate-700'
                    }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.value && (
                    <Check size={14} className="text-sky-600 flex-shrink-0" />
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-4 text-xs text-center text-slate-400 italic">
                No matching results found
              </div>
            )}
          </div>

          {/* Always visible Add New at the bottom */}
          {onAdd && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAdd();
                setIsOpen(false);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAdd();
                setIsOpen(false);
              }}
              className="w-full border-t border-slate-100 px-4 py-2.5 text-sky-600 hover:bg-sky-50 transition-all flex items-center justify-center gap-2 bg-white active:bg-sky-100 font-bold text-xs uppercase tracking-wider"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Add New Option</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
