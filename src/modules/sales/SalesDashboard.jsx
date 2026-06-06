
import React from 'react';
import ERPLayout from '../../components/layout/ERPLayout';
import { ShoppingCart, Construction } from 'lucide-react';

const SalesDashboard = () => {
  return (
    <ERPLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-3xl border border-gray-100 shadow-xl p-12 text-center">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-6 animate-pulse">
          <ShoppingCart className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">( IMS ) Inventory Management System</h1>
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-full text-sm font-bold mb-8">
          <Construction className="w-4 h-4" />
          UNDER DEVELOPMENT
        </div>
        <p className="text-gray-500 max-w-md leading-relaxed">
          The Sales management system is currently being architected. This module will include order tracking, customer relationship management, and sales analytics.
        </p>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl">
          {['Order Management', 'Customer DB', 'Sales Pipeline'].map((feature) => (
            <div key={feature} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-widest">
              {feature}
            </div>
          ))}
        </div>
      </div>
    </ERPLayout>
  );
};

export default SalesDashboard;
