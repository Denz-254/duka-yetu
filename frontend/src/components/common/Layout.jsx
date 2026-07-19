import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import useSubscriptionStore from '../../store/subscriptionStore';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fetchSubscription = useSubscriptionStore((state) => state.fetchSubscription);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <main
        className={`transition-all duration-300 min-h-screen ${
          sidebarOpen ? 'ml-[280px]' : 'ml-[80px]'
        }`}
      >
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;