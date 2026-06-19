import React from 'react';

export default function OtherInformationTab({ otherInfo, setOtherInfo, quotationStatus, setQuotationStatus, supplyStatus, setSupplyStatus, isSalesReturn = false }) {
  const handleChange = (field, value) => {
    if (setOtherInfo) {
      setOtherInfo(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const info = otherInfo || {};

  if (isSalesReturn) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-2 py-4">
        {/* Against Invoice No. */}
        <div className="space-y-1.5">
          <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
            Against Invoice / Bill of Supply No.
          </label>
          <input 
            type="text" 
            value={info.againstInvoiceNo || ''} 
            onChange={(e) => handleChange('againstInvoiceNo', e.target.value)} 
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-xs md:text-sm h-[44px] bg-white outline-none shadow-sm transition-all" 
          />
        </div>

        {/* Date of Invoice */}
        <div className="space-y-1.5">
          <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
            Date of Invoice / Bill of Supply
          </label>
          <input 
            type="date" 
            value={info.againstInvoiceDate || ''} 
            onChange={(e) => handleChange('againstInvoiceDate', e.target.value)} 
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-xs md:text-sm h-[44px] bg-white outline-none shadow-sm transition-all" 
          />
        </div>

        {/* Issue Reason */}
        <div className="space-y-1.5">
          <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
            Issue Reason
          </label>
          <select 
            value={info.issueReason || '07-Others'} 
            onChange={(e) => handleChange('issueReason', e.target.value)} 
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-xs md:text-sm h-[44px] bg-white outline-none shadow-sm transition-all"
          >
            <option value="01-Sales Return">01-Sales Return</option>
            <option value="02-Post Sale Discount">02-Post Sale Discount</option>
            <option value="03-Deficiency in services">03-Deficiency in services</option>
            <option value="04-Correction in Invoice">04-Correction in Invoice</option>
            <option value="05-Change in Scheme">05-Change in Scheme</option>
            <option value="06-Others">06-Others</option>
            <option value="07-Others">07-Others</option>
          </select>
        </div>

        {/* Party Ref.No. */}
        <div className="space-y-1.5">
          <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
            Party Ref.No.
          </label>
          <input 
            type="text" 
            value={info.customerReference || ''} 
            onChange={(e) => handleChange('customerReference', e.target.value)} 
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-xs md:text-sm h-[44px] bg-white outline-none shadow-sm transition-all" 
          />
        </div>

        {/* Party Ref. Date */}
        <div className="space-y-1.5">
          <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
            Party Ref. Date (PO/Ref. Date)
          </label>
          <input 
            type="date" 
            value={info.poDate || ''} 
            onChange={(e) => handleChange('poDate', e.target.value)} 
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-xs md:text-sm h-[44px] bg-white outline-none shadow-sm transition-all" 
          />
        </div>

        {/* Party Challan No. */}
        <div className="space-y-1.5">
          <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
            Party Challan No.
          </label>
          <input 
            type="text" 
            value={info.challanNo || ''} 
            onChange={(e) => handleChange('challanNo', e.target.value)} 
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-xs md:text-sm h-[44px] bg-white outline-none shadow-sm transition-all" 
          />
        </div>

        {/* Party Challan Date */}
        <div className="space-y-1.5">
          <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
            Party Challan Date
          </label>
          <input 
            type="date" 
            value={info.challanDate || ''} 
            onChange={(e) => handleChange('challanDate', e.target.value)} 
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-xs md:text-sm h-[44px] bg-white outline-none shadow-sm transition-all" 
          />
        </div>

        {/* Sales Person */}
        <div className="space-y-1.5">
          <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
            Sales Person
          </label>
          <input 
            type="text" 
            value={info.salesPerson || ''} 
            onChange={(e) => handleChange('salesPerson', e.target.value)} 
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-xs md:text-sm h-[44px] bg-white outline-none shadow-sm transition-all" 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-2 py-4">
      
      {/* Ship to */}
      <div className="space-y-1.5">
        <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
          Ship to
        </label>
        <input 
          type="text" 
          value={info.shipTo || ''} 
          onChange={(e) => handleChange('shipTo', e.target.value)} 
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm md:text-base h-[44px] bg-white outline-none shadow-sm transition-all" 
        />
      </div>

      {/* Project */}
      <div className="space-y-1.5">
        <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
          Project
        </label>
        <input 
          type="text" 
          value={info.project || ''} 
          onChange={(e) => handleChange('project', e.target.value)} 
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm md:text-base h-[44px] bg-white outline-none shadow-sm transition-all" 
        />
      </div>

      {/* Cust.Ref.Number */}
      <div className="space-y-1.5">
        <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
          Cust.Ref.Number
        </label>
        <input 
          type="text" 
          value={info.customerReference || ''} 
          onChange={(e) => handleChange('customerReference', e.target.value)} 
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm md:text-base h-[44px] bg-white outline-none shadow-sm transition-all" 
        />
      </div>

      {/* Sales Person */}
      <div className="space-y-1.5">
        <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
          Sales Person
        </label>
        <input 
          type="text" 
          value={info.salesPerson || ''} 
          onChange={(e) => handleChange('salesPerson', e.target.value)} 
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm md:text-base h-[44px] bg-white outline-none shadow-sm transition-all" 
        />
      </div>

      {/* Ref.Source Type */}
      <div className="space-y-1.5">
        <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
          Ref.Source Type
        </label>
        <input 
          type="text" 
          value={info.refSourceType || ''} 
          onChange={(e) => handleChange('refSourceType', e.target.value)} 
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm md:text-base h-[44px] bg-white outline-none shadow-sm transition-all" 
        />
      </div>

      {/* Main Agent */}
      <div className="space-y-1.5">
        <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
          Main Agent
        </label>
        <input 
          type="text" 
          value={info.mainAgent || ''} 
          onChange={(e) => handleChange('mainAgent', e.target.value)} 
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm md:text-base h-[44px] bg-white outline-none shadow-sm transition-all" 
        />
      </div>

      {/* Architect Name */}
      <div className="space-y-1.5">
        <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
          Architect Name
        </label>
        <input 
          type="text" 
          value={info.architectName || ''} 
          onChange={(e) => handleChange('architectName', e.target.value)} 
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm md:text-base h-[44px] bg-white outline-none shadow-sm transition-all" 
        />
      </div>

      {/* Sales Number */}
      <div className="space-y-1.5">
        <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
          Sales Number
        </label>
        <input 
          type="text" 
          value={info.salesNumber || ''} 
          onChange={(e) => handleChange('salesNumber', e.target.value)} 
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm md:text-base h-[44px] bg-white outline-none shadow-sm transition-all" 
        />
      </div>

      {/* Transportation Mode */}
      <div className="space-y-1.5">
        <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
          Transportation Mode
        </label>
        <input 
          type="text" 
          value={info.transportationMode || ''} 
          onChange={(e) => handleChange('transportationMode', e.target.value)} 
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm md:text-base h-[44px] bg-white outline-none shadow-sm transition-all" 
        />
      </div>

      {/* Vehicle No. */}
      <div className="space-y-1.5">
        <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
          Vehicle No.
        </label>
        <input 
          type="text" 
          value={info.vehicleNo || ''} 
          onChange={(e) => handleChange('vehicleNo', e.target.value)} 
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm md:text-base h-[44px] bg-white outline-none shadow-sm transition-all" 
        />
      </div>

      {/* Date of Supply */}
      <div className="space-y-1.5">
        <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
          Date of Supply
        </label>
        <input 
          type="date" 
          value={info.dateOfSupply || ''} 
          onChange={(e) => handleChange('dateOfSupply', e.target.value)} 
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm md:text-base h-[44px] bg-white outline-none shadow-sm transition-all" 
        />
      </div>

      {/* Place of Supply */}
      <div className="space-y-1.5">
        <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
          Place of Supply
        </label>
        <input 
          type="text" 
          value={info.placeOfSupply || ''} 
          onChange={(e) => handleChange('placeOfSupply', e.target.value)} 
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm md:text-base h-[44px] bg-white outline-none shadow-sm transition-all" 
        />
      </div>

      {/* PO/Ref. Date */}
      <div className="space-y-1.5">
        <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
          PO/Ref. Date
        </label>
        <input 
          type="date" 
          value={info.poDate || ''} 
          onChange={(e) => handleChange('poDate', e.target.value)} 
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm md:text-base h-[44px] bg-white outline-none shadow-sm transition-all" 
        />
      </div>

      {/* Ack No. */}
      <div className="space-y-1.5">
        <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
          Ack. No.
        </label>
        <input 
          type="text" 
          value={info.ackNo || ''} 
          onChange={(e) => handleChange('ackNo', e.target.value)} 
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm md:text-base h-[44px] bg-white outline-none shadow-sm transition-all" 
        />
      </div>

      {/* IRN No. */}
      <div className="space-y-1.5">
        <label className="block text-sm md:text-base text-slate-700 font-semibold uppercase tracking-wider">
          IRN No.
        </label>
        <input 
          type="text" 
          value={info.irnNo || ''} 
          onChange={(e) => handleChange('irnNo', e.target.value)} 
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-sm md:text-base h-[44px] bg-white outline-none shadow-sm transition-all" 
        />
      </div>

    </div>
  );
}
