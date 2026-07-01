import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Settings from './pages/Settings';
import ItemDetails from './pages/Master/ItemDetails';
import InventoryForm from './pages/InventoryForm/InventoryForm';
import InventoryHistory from './pages/InventoryForm/InventoryHistory';
import Dasboard from './pages/Dashboard/Dasboard';
import SalesModule from './pages/Sales/SalesModule';
import PurchaseModule from './pages/Purchase/PurchaseModule';
import OrderSummary from './pages/Sales/OrderSummary';
import ItemTracker from './pages/ItemTracker/ItemTracker';

import { useAuthStore } from './store/authStore';
import { initializeStorage } from './utils/storageManager';

const IndexRedirect = () => {
  const role = localStorage.getItem('role');
  const isAdmin = role?.toLowerCase() === 'admin';
  return <Navigate to={isAdmin ? "/ims/dashboard" : "/ims/create-indent"} replace />;
};

function App() {
  useEffect(() => {
    initializeStorage();
  }, []);

  return (
    <div className="bg-white min-h-screen">
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} containerStyle={{ zIndex: 999999 }} />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<IndexRedirect />} />
            <Route path="dashboard" element={<Dasboard />} />
            <Route path="settings" element={<Settings />} />
            <Route path="master" element={<ItemDetails />} />
            <Route path="create-indent" element={<InventoryForm />} />
            <Route path="indent-history" element={<InventoryHistory />} />
            <Route path="sales" element={<SalesModule />} />
            <Route path="purchase" element={<PurchaseModule />} />
            <Route path="order-summary" element={<OrderSummary />} />
            <Route path="item-tracker" element={<ItemTracker />} />
          </Route>

        </Routes>
    </div>
  );
}

export default App;