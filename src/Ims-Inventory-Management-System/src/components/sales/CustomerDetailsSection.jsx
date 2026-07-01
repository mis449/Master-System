import React, { useEffect } from 'react';
import { Calendar, Users } from 'lucide-react';
import useDataStore from '../../store/dataStore';
import SearchableDropdown from '../SearchableDropdown';

export default function CustomerDetailsSection({ 
  basicInfo, 
  setBasicInfo, 
  onOpenCustomerModal,
  onCustomerSelect,
  onEditCustomer
}) {
  const { customers, fetchCustomers } = useDataStore();

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);
  return (
    <div className="bg-sky-50/40 p-5 rounded-2xl border border-sky-100">
      <div className="flex justify-between items-center mb-4 border-b border-sky-100 pb-2">
        <h3 className="text-sm font-bold text-sky-800 uppercase tracking-wider">Basic Information</h3>
        <div className="flex gap-2">
          <button type="button" onClick={onOpenCustomerModal} className="text-xs font-bold bg-white text-sky-600 border border-sky-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-sky-50 transition">
            <Users size={14} /> New Customer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] text-slate-700 font-medium uppercase tracking-wider">Customer / Vendor *</label>
            {basicInfo.customer && onEditCustomer && (
              <button 
                type="button" 
                onClick={onEditCustomer}
                className="text-[10px] font-bold bg-white text-sky-600 border border-sky-200 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-sky-50 shadow-sm transition"
                title="Edit Customer Details"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Edit
              </button>
            )}
          </div>
          <SearchableDropdown
            options={(customers || []).map(c => ({ value: c.name, label: c.name }))}
            value={basicInfo.customer || ''}
            onChange={(val) => {
              setBasicInfo({...basicInfo, customer: val});
              
              const matchedCustomer = customers.find(c => c.name === val);
              if (matchedCustomer && onCustomerSelect) {
                onCustomerSelect(matchedCustomer);
              }
            }}
            onAdd={onOpenCustomerModal}
            placeholder="-- Select Customer --"
            className="w-full"
            height="h-[38px]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] text-slate-700 font-medium uppercase tracking-wider">Address</label>
          <input type="text" value={basicInfo.address} onChange={(e) => setBasicInfo({...basicInfo, address: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-xs md:text-sm h-[38px] bg-white outline-none" placeholder="Billing Address" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] text-slate-700 font-medium uppercase tracking-wider">Validity/Due Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-[10px] text-slate-400" size={14} />
            <input type="date" value={basicInfo.validityDate} onChange={(e) => setBasicInfo({...basicInfo, validityDate: e.target.value})} className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-xs md:text-sm h-[38px] bg-white outline-none" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] text-slate-700 font-medium uppercase tracking-wider">Price List</label>
          <select value={basicInfo.priceList} onChange={(e) => setBasicInfo({...basicInfo, priceList: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-xs md:text-sm h-[38px] bg-white outline-none">
            <option value="Standard">Standard</option>
            <option value="Wholesale">Wholesale</option>
            <option value="Retail">Retail</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] text-slate-700 font-medium uppercase tracking-wider">Payment Terms</label>
          <select value={basicInfo.paymentTerms} onChange={(e) => setBasicInfo({...basicInfo, paymentTerms: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-xs md:text-sm h-[38px] bg-white outline-none">
            <option value="">-- Select --</option>
            <option value="100% AGAINST DELIVERY">100% AGAINST DELIVERY</option>
            <option value="Against 50% Advance and rest on Delivery">Against 50% Advance and rest on Delivery</option>
            <option value="Against L/C">Against L/C</option>
            <option value="AS ABOVE">AS ABOVE</option>
            <option value="AS USUAL">AS USUAL</option>
            <option value="Collection Thru Bank">Collection Thru Bank</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] text-slate-700 font-medium uppercase tracking-wider">Area / PIN Code<span className="text-red-500">*</span></label>
          <input type="text" value={basicInfo.areaPinCode || ''} onChange={(e) => setBasicInfo({...basicInfo, areaPinCode: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-xs md:text-sm h-[38px] bg-white outline-none" placeholder="Area / PIN Code" required />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] text-slate-700 font-medium uppercase tracking-wider">City / State</label>
          <input type="text" value={basicInfo.cityState || ''} onChange={(e) => setBasicInfo({...basicInfo, cityState: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-xs md:text-sm h-[38px] bg-white outline-none" placeholder="City / State" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] text-slate-700 font-medium uppercase tracking-wider">Email</label>
          <input type="email" value={basicInfo.email || ''} onChange={(e) => setBasicInfo({...basicInfo, email: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-xs md:text-sm h-[38px] bg-white outline-none" placeholder="Email Address" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] text-slate-700 font-medium uppercase tracking-wider">Mobile<span className="text-red-500">*</span></label>
          <input type="text" value={basicInfo.mobile || ''} onChange={(e) => setBasicInfo({...basicInfo, mobile: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 text-xs md:text-sm h-[38px] bg-white outline-none" placeholder="Mobile Number" required />
        </div>
      </div>
    </div>
  );
}
