import React, { useState, useEffect } from 'react';
import ModalForm from '../../components/ModalForm';

export default function BrandDiscountModal({ isOpen, onClose, items, inventoryItems, onApply }) {
  const [brandData, setBrandData] = useState([]);

  useEffect(() => {
    if (isOpen) {
      const brandMap = {};
      let lineNumber = 0;

      items.forEach((item) => {
        if (item.type === 'item') {
          lineNumber++; // Only increment for actual items
          if (item.itemCode) {
            const invItem = inventoryItems.find(i => (i.ItemCode || i.code) === item.itemCode);
            let rawBrand = invItem ? (invItem.BrandName || invItem.brand || '') : '';
            if (typeof rawBrand === 'string') rawBrand = rawBrand.trim();
            const brand = rawBrand ? rawBrand : 'UNBRANDED';
            
            if (!brandMap[brand]) {
              brandMap[brand] = {
                brandName: brand,
                oldDiscount: item.discountPercent || 0,
                newDiscount: '', // Default to empty so we don't accidentally apply 0
                lineNumbers: []
              };
            }
            brandMap[brand].lineNumbers.push(lineNumber);
          }
        }
      });

      setBrandData(Object.values(brandMap).sort((a, b) => a.brandName.localeCompare(b.brandName)));
    }
  }, [isOpen, items, inventoryItems]);

  const handleDiscountChange = (index, value) => {
    setBrandData(prev => prev.map((b, i) => i === index ? { ...b, newDiscount: value } : b));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const discountsToApply = {};
    let hasChanges = false;
    
    brandData.forEach(b => {
      // Only apply if user actually typed a value
      if (b.newDiscount !== '' && b.newDiscount !== undefined) {
        const parsedVal = parseFloat(b.newDiscount);
        if (!isNaN(parsedVal)) {
          // Send original brand name back, handle UNBRANDED translation
          const targetBrand = b.brandName === 'UNBRANDED' ? 'NO BRAND' : b.brandName;
          discountsToApply[targetBrand] = parsedVal;
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      onApply(discountsToApply);
    }
    onClose();
  };

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title="Brand-wise Discount"
      onSubmit={handleSubmit}
      submitText="Ok"
      cancelText="Discard"
      maxWidth="max-w-5xl"
    >
      <div className="w-full overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">Brands</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider text-center">Old Rate/Value</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider text-center">Rate/Value to Change</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider text-center">Max Discount Limit</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">Line Number(s)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {brandData.map((data, idx) => (
                <tr key={data.brandName} className="hover:bg-sky-50/50 transition-colors group">
                  <td className="px-4 py-2.5 font-bold text-slate-800 uppercase tracking-wide text-xs">
                    {data.brandName === 'UNBRANDED' ? (
                      <span className="text-slate-400 font-semibold">Unbranded Items</span>
                    ) : (
                      data.brandName
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-100">
                      {data.oldDiscount}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-20 border border-slate-300 rounded px-2 py-1 text-center text-sm font-bold text-sky-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slate-300 placeholder:font-normal shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={data.newDiscount}
                      onChange={(e) => handleDiscountChange(idx, e.target.value)}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="text-slate-400 font-semibold text-xs">0%</span>
                  </td>
                  <td className="px-4 py-2.5 text-[11px] text-slate-500 whitespace-normal break-words max-w-[280px] leading-relaxed">
                    {data.lineNumbers.join(', ')}
                  </td>
                </tr>
              ))}
              {brandData.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                        <span className="text-2xl">📦</span>
                      </div>
                      <span className="text-sm font-bold text-slate-700">No items found</span>
                      <span className="text-xs text-slate-400">Add products to your quotation to apply brand discounts.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModalForm>
  );
}
