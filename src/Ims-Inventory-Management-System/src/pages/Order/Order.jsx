import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import InvoiceList from '../Sales/InvoiceList';
import SalesReturnList from '../Sales/SalesReturnList';
import QuotationList from '../QuotationForm/QuotationList';
import ChallanList from '../Challan/ChallanList';

export default function Order() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Default to Order tab which shows In Progress and Completed quotations
  const [activeTab, setActiveTab] = useState('Order');
  const [conversionContext, setConversionContext] = useState(null);

  useEffect(() => {
    // Check if we navigated here with conversion context (e.g. from Quotation)
    if (location.state && location.state.source) {
      setConversionContext(location.state);
      setActiveTab('Invoice');
      // Clear the location state so it doesn't trigger again on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

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
            {['Order', 'Challan', 'Invoice', 'Sales Return'].map((tab) => (
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
          {activeTab === 'Order' && (
            <QuotationList 
              mode="orders"
              onConvertToInvoice={(data) => {
                setConversionContext({ source: 'Quotation', data });
                setActiveTab('Invoice');
              }} 
              onConvertToChallan={(data) => {
                setConversionContext({ source: 'Order', data });
                setActiveTab('Challan');
              }}
            />
          )}
          {activeTab === 'Challan' && (
            <ChallanList 
              conversionContext={conversionContext} 
              clearConversionContext={clearConversionContext}
              onConvertToInvoice={(data) => {
                setConversionContext({ source: 'Challan', data });
                setActiveTab('Invoice');
              }}
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
