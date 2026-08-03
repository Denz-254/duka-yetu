import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import useAuthStore from '../../store/authStore';
import useSubscriptionStore from '../../store/subscriptionStore';
import { business as businessApi } from '../../api/endpoints';
import { toast } from 'react-hot-toast';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fetchSubscription = useSubscriptionStore((state) => state.fetchSubscription);
  const clearSubscription = useSubscriptionStore((state) => state.clear);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const lastActivity = useRef(Date.now());
  const timeoutMinutes = useRef(60);
  const autoLogout = useRef(true);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    businessApi.getSettings('security')
      .then(({ data }) => {
        if (data?.session_timeout_minutes) {
          timeoutMinutes.current = Number(data.session_timeout_minutes) || 60;
        }
        if (typeof data?.auto_logout_idle === 'boolean') {
          autoLogout.current = data.auto_logout_idle;
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const bump = () => { lastActivity.current = Date.now(); };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const timer = setInterval(() => {
      if (!autoLogout.current) return;
      const idleMs = Date.now() - lastActivity.current;
      const limit = timeoutMinutes.current * 60 * 1000;
      if (idleMs >= limit) {
        clearSubscription();
        logout();
        toast('Session expired');
        navigate('/login', { replace: true });
      }
    }, 30000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(timer);
    };
  }, [clearSubscription, logout, navigate]);

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
