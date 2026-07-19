import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaStore, 
  FaHome, 
  FaShoppingCart, 
  FaBoxes, 
  FaChartBar, 
  FaUsers, 
  FaUserFriends, 
  FaBuilding,
  FaCog,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaChevronUp,
  FaSignOutAlt,
  FaUserCircle,
  FaClipboardList,
  FaReceipt,
  FaCreditCard,
  FaShieldAlt,
  FaCrown,
  FaTags,
  FaTruck,
  FaBarcode
} from 'react-icons/fa';
import useAuthStore from '../../store/authStore';
import useSubscriptionStore from '../../store/subscriptionStore';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const subscriptionActive = useSubscriptionStore((state) => state.active);
  const features = useSubscriptionStore((state) => state.features);
  const clearSubscription = useSubscriptionStore((state) => state.clear);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', icon: FaHome, label: 'Dashboard', feature: 'basic_reports' },
    { path: '/pos', icon: FaShoppingCart, label: 'POS', feature: 'pos' },
    { path: '/orders', icon: FaClipboardList, label: 'Online Orders', feature: 'pos' },
  ];

  const inventoryItems = [
    { path: '/products', icon: FaBoxes, label: 'All Products', feature: 'products' },
    { path: '/categories', icon: FaTags, label: 'Categories', feature: 'inventory', ownerOnly: true },
    { path: '/stock-management', icon: FaBarcode, label: 'Stock Management', feature: 'inventory', ownerOnly: true },
    { path: '/suppliers', icon: FaTruck, label: 'Suppliers', feature: 'suppliers', ownerOnly: true },
  ];

  const navItemsBottom = [
    { path: '/reports', icon: FaChartBar, label: 'Reports', feature: 'basic_reports' },
    { path: '/staff', icon: FaUsers, label: 'Staff', feature: 'business_settings', ownerOnly: true },
    { path: '/customers', icon: FaUserFriends, label: 'Customers', feature: 'customers' },
    { path: '/branches', icon: FaBuilding, label: 'Branches', feature: 'business_settings', ownerOnly: true },
  ];

  const settingsItems = [
    { path: '/settings/profile', icon: FaUserCircle, label: 'Business Profile', feature: 'business_settings', ownerOnly: true },
    { path: '/settings/payment', icon: FaCreditCard, label: 'Payment Settings', feature: 'business_settings', ownerOnly: true },
    { path: '/settings/receipt', icon: FaReceipt, label: 'Receipt Settings', feature: 'business_settings', ownerOnly: true },
    { path: '/settings/tax', icon: FaClipboardList, label: 'Tax Settings', feature: 'business_settings', ownerOnly: true },
    { path: '/settings/subscription', icon: FaCrown, label: 'Subscription', ownerOnly: true },
    { path: '/settings/security', icon: FaShieldAlt, label: 'Security Settings', feature: 'business_settings', ownerOnly: true },
  ];

  const isActive = (path) => location.pathname === path;
  const canAccess = (item) => {
    if (item.ownerOnly && user?.role !== 'OWNER') return false;
    return !item.feature || (subscriptionActive && features.includes(item.feature));
  };
  const isInventoryActive = () => inventoryItems.some(({ path }) => location.pathname === path);

  const handleLogout = () => {
    clearSubscription();
    logout();
    window.location.href = '/login';
  };

  return (
    <motion.div
      initial={{ width: isOpen ? 280 : 80 }}
      animate={{ width: isOpen ? 280 : 80 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-full bg-gradient-to-b from-primary-800 to-primary-900 shadow-xl z-50 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-primary-700/30">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
            <FaStore className="text-white text-lg" />
          </div>
          {isOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-bold text-white"
            >
              Duka Yetu
            </motion.span>
          )}
        </Link>
        <button
          onClick={toggleSidebar}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
        >
          {isOpen ? <FaChevronLeft /> : <FaChevronRight />}
        </button>
      </div>

      {/* User Profile */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-primary-700/30">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">
            {user?.name?.split(' ').map(n => n[0]).join('') || 'JD'}
          </span>
        </div>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex-1 min-w-0"
          >
            <p className="text-sm font-semibold text-white truncate">{user?.name || 'John Doe'}</p>
            <p className="text-xs text-primary-200 truncate">{user?.role || 'Admin'}</p>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-primary-600 scrollbar-track-transparent">
        {/* Main Nav Items */}
        {navItems.filter(canAccess).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`text-lg ${isActive(item.path) ? 'text-white' : 'text-white/60'}`} />
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-sm"
                >
                  {item.label}
                </motion.span>
              )}
            </Link>
          );
        })}

        {/* Inventory Dropdown */}
        <div className="mt-1">
          <button
            onClick={() => setInventoryOpen(!inventoryOpen)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              isInventoryActive()
                ? 'bg-white/20 text-white font-medium'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <FaBoxes className={`text-lg ${isInventoryActive() ? 'text-white' : 'text-white/60'}`} />
            {isOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-sm flex-1 text-left"
              >
                Inventory
              </motion.span>
            )}
            {isOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {inventoryOpen ? <FaChevronUp className="text-xs text-white/50" /> : <FaChevronDown className="text-xs text-white/50" />}
              </motion.span>
            )}
          </button>

          <AnimatePresence>
            {inventoryOpen && isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="ml-6 mt-1 space-y-1 overflow-hidden"
              >
                {inventoryItems.filter(canAccess).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                        isActive(item.path)
                          ? 'bg-white/10 text-white'
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className={`text-sm ${isActive(item.path) ? 'text-white' : 'text-white/40'}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Nav Items */}
        {navItemsBottom.filter(canAccess).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`text-lg ${isActive(item.path) ? 'text-white' : 'text-white/60'}`} />
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-sm"
                >
                  {item.label}
                </motion.span>
              )}
            </Link>
          );
        })}

        {/* Settings Dropdown */}
        <div className="mt-2">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              location.pathname.startsWith('/settings')
                ? 'bg-white/20 text-white font-medium'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <FaCog className={`text-lg ${location.pathname.startsWith('/settings') ? 'text-white' : 'text-white/60'}`} />
            {isOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-sm flex-1 text-left"
              >
                Settings
              </motion.span>
            )}
            {isOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {settingsOpen ? <FaChevronUp className="text-xs text-white/50" /> : <FaChevronDown className="text-xs text-white/50" />}
              </motion.span>
            )}
          </button>

          <AnimatePresence>
            {settingsOpen && isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="ml-6 mt-1 space-y-1 overflow-hidden"
              >
                {settingsItems.filter(canAccess).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                        isActive(item.path)
                          ? 'bg-white/10 text-white'
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className={`text-sm ${isActive(item.path) ? 'text-white' : 'text-white/40'}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Logout */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-primary-700/30 bg-primary-900">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200"
        >
          <FaSignOutAlt className="text-lg" />
          {isOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-sm"
            >
              Logout
            </motion.span>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default Sidebar;