import React, { useState } from 'react';
import PurchaseList from './PurchaseList';
import PurchaseReturnList from './PurchaseReturnList';

export default function PurchaseModule() {
  const [activeTab, setActiveTab] = useState('Purchase');
  
  // Context to pass data between tabs when converting (e.g. PO -> Purchase)
  const [conversionContext, setConversionContext] = useState(null);

  const handleConvertToPurchase = (poData) => {
    setConversionContext({ source: 'Purchase Order', data: poData });
    setActiveTab('Purchase');
  };

  const handleCreatePurchaseReturn = (purchaseData) => {
    setConversionContext({ source: 'Purchase', data: purchaseData });
    setActiveTab('Purchase Return');
  };


  

  const clearConversionContext = () => {
    setConversionContext(null);
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 h-full flex flex-col min-h-0">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 w-full flex-1 flex flex-col min-h-0">
        
        {/* Module Header & Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex-shrink-0">
          <div className="flex gap-2 bg-slate-100/50 p-1 rounded-xl">
            {['Purchase', 'Purchase Return'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
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
          {activeTab === 'Purchase' && (
            <PurchaseList 
              conversionContext={conversionContext} 
              clearConversionContext={clearConversionContext}
              onCreatePurchaseReturn={handleCreatePurchaseReturn}
            />
          )}
          {activeTab === 'Purchase Return' && (
            <PurchaseReturnList 
              conversionContext={conversionContext} 
              clearConversionContext={clearConversionContext}
            />
          )}
        </div>

      </div>
    </div>
  );
}
