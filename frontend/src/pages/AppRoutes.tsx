import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Nav } from '@/components/layout/Nav';
import { ToastContainer } from '@/components/notifications/ToastContainer';
import { Dashboard } from './Dashboard';
import { Pos } from './Pos';
import { Inventory } from './Inventory';
import { ProductDetail } from './ProductDetail';
import { Sales } from './Sales';
import { Checkout } from './Checkout';

function AppRoutes() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Nav />
        <main className="flex-1 overflow-x-hidden px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<Pos />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/inventory/:id" element={<ProductDetail />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/checkout" element={<Checkout />} />
          </Routes>
        </main>
        <ToastContainer />
      </div>
    </BrowserRouter>
  );
}

export default AppRoutes;
