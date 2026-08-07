import React from 'react';
import { useNavigate } from 'react-router-dom';
import QuotationList from '../QuotationForm/QuotationList';

export default function SalesModule() {
  const navigate = useNavigate();

  const handleConvertToInvoice = (quotationData) => {
    // Navigate to Order page with conversion context
    navigate('/ims/order', { state: { source: 'Quotation', data: quotationData } });
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 h-full flex flex-col min-h-0">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 w-full flex-1 flex flex-col min-h-0">
        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col min-h-0 overflow-hidden">
          <QuotationList 
            onConvertToInvoice={handleConvertToInvoice} 
          />
        </div>

      </div>
    </div>
  );
}
