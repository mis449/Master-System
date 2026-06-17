import React, { useState } from 'react';
import QuotationList from '../QuotationForm/QuotationList';
import InvoiceList from './InvoiceList';
import SalesReturnList from './SalesReturnList';
import DispatchList from './DispatchList';

export default function SalesModule() {
  const [activeTab, setActiveTab] = useState('Quotation');
  
  // Context to pass data between tabs when converting (e.g. Quotation -> Invoice)
  const [conversionContext, setConversionContext] = useState(null);

  const handleConvertToInvoice = (quotationData) => {
    setConversionContext({ source: 'Quotation', data: quotationData });
    setActiveTab('Invoice');
  };

  const handleCreateSalesReturn = (invoiceData) => {
    setConversionContext({ source: 'Invoice', data: invoiceData });
    setActiveTab('Sales Return');
  };

  const clearConversionContext = () => {
    setConversionContext(null);
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 h-full flex flex-col min-h-0">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 w-full flex-1 flex flex-col min-h-0">
        
        {/* Module Header & Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex-shrink-0">
          <div className="flex gap-2 bg-slate-100/50 p-1 rounded-xl overflow-x-auto">
            {['Quotation', 'Invoice', 'Sales Return'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-white text-sky-700 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeTab === 'Quotation' && (
            <QuotationList 
              onConvertToInvoice={handleConvertToInvoice} 
            />
          )}

          {activeTab === 'Invoice' && (
            <InvoiceList 
              conversionContext={conversionContext} 
              clearConversionContext={clearConversionContext}
              onCreateSalesReturn={handleCreateSalesReturn}
            />
          )}
          {activeTab === 'Sales Return' && (
            <SalesReturnList 
              conversionContext={conversionContext} 
              clearConversionContext={clearConversionContext}
            />
          )}
        </div>

      </div>
    </div>
  );
}
