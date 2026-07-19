import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import useSubscriptionStore from './store/subscriptionStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import POSPage from './pages/POSPage';
import StaffPage from './pages/StaffPage';
import ReportsPage from './pages/ReportsPage';
import CustomersPage from './pages/CustomersPage';
import BranchesPage from './pages/BranchesPage';
import CategoriesPage from './pages/CategoriesPage';
import StockManagementPage from './pages/StockManagementPage';
import SuppliersPage from './pages/SuppliersPage';
import BusinessProfilePage from './pages/BusinessProfilePage';
import PaymentSettingsPage from './pages/PaymentSettingsPage';
import ReceiptSettingsPage from './pages/ReceiptSettingsPage';
import TaxSettingsPage from './pages/TaxSettingsPage';
import SubscriptionPage from './pages/SubscriptionPage';
import SecuritySettingsPage from './pages/SecuritySettingsPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import PendingApprovalPage from './pages/PendingApprovalPage';
import MarketplacePage from './pages/MarketplacePage';
import MarketplaceProductPage from './pages/MarketplaceProductPage';
import MarketplaceCheckoutPage from './pages/MarketplaceCheckoutPage';
import OrdersPage from './pages/OrdersPage';
import Layout from './components/common/Layout';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const SuperAdminRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role !== 'SUPER_ADMIN') return <Navigate to="/dashboard" />;
  return children;
};

const ApprovedBusinessRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const business = useAuthStore((state) => state.business);
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role === 'SUPER_ADMIN') return <Navigate to="/admin" />;
  if (business?.approval_status && business.approval_status !== 'APPROVED') {
    return <Navigate to="/pending-approval" />;
  }
  return children;
};

const FeatureRoute = ({ feature, children }) => {
  const loaded = useSubscriptionStore((state) => state.loaded);
  const active = useSubscriptionStore((state) => state.active);
  const features = useSubscriptionStore((state) => state.features);
  if (!loaded) return <div className="p-8 text-center text-gray-500">Checking your plan...</div>;
  return active && features.includes(feature)
    ? children
    : <Navigate to="/settings/subscription" replace />;
};

function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/shop" element={<MarketplacePage />} />
        <Route path="/shop/product/:id" element={<MarketplaceProductPage />} />
        <Route path="/shop/checkout" element={<MarketplaceCheckoutPage />} />
        <Route path="/pending-approval" element={<ProtectedRoute><PendingApprovalPage /></ProtectedRoute>} />
        <Route path="/admin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />

        {/* Protected routes with Layout (Sidebar) */}
        <Route
          path="/"
          element={
            <ApprovedBusinessRoute>
              <Layout />
            </ApprovedBusinessRoute>
          }
        >
          {/* Main Pages */}
          <Route path="dashboard" element={<FeatureRoute feature="basic_reports"><DashboardPage /></FeatureRoute>} />
          <Route path="pos" element={<FeatureRoute feature="pos"><POSPage /></FeatureRoute>} />
          <Route path="products" element={<FeatureRoute feature="products"><ProductsPage /></FeatureRoute>} />
          <Route path="orders" element={<FeatureRoute feature="pos"><OrdersPage /></FeatureRoute>} />
          <Route path="staff" element={<FeatureRoute feature="business_settings"><StaffPage /></FeatureRoute>} />
          <Route path="reports" element={<FeatureRoute feature="basic_reports"><ReportsPage /></FeatureRoute>} />
          <Route path="customers" element={<FeatureRoute feature="customers"><CustomersPage /></FeatureRoute>} />
          <Route path="branches" element={<FeatureRoute feature="business_settings"><BranchesPage /></FeatureRoute>} />

          {/* Inventory Pages */}
          <Route path="categories" element={<FeatureRoute feature="inventory"><CategoriesPage /></FeatureRoute>} />
          <Route path="stock-management" element={<FeatureRoute feature="inventory"><StockManagementPage /></FeatureRoute>} />
          <Route path="suppliers" element={<FeatureRoute feature="suppliers"><SuppliersPage /></FeatureRoute>} />

          {/* Settings Pages */}
          <Route path="settings/profile" element={<FeatureRoute feature="business_settings"><BusinessProfilePage /></FeatureRoute>} />
          <Route path="settings/payment" element={<FeatureRoute feature="business_settings"><PaymentSettingsPage /></FeatureRoute>} />
          <Route path="settings/receipt" element={<FeatureRoute feature="business_settings"><ReceiptSettingsPage /></FeatureRoute>} />
          <Route path="settings/tax" element={<FeatureRoute feature="business_settings"><TaxSettingsPage /></FeatureRoute>} />
          <Route path="settings/subscription" element={<SubscriptionPage />} />
          <Route path="settings/security" element={<FeatureRoute feature="business_settings"><SecuritySettingsPage /></FeatureRoute>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;