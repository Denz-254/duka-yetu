import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import useAuthStore from '../../store/authStore';
import useSubscriptionStore from '../../store/subscriptionStore';
import { business as businessApi } from '../../api/endpoints';
import { toast } from 'react-hot-toast';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const fetchSubscription = useSubscriptionStore((state) => state.fetchSubscription);
  const clearSubscription = useSubscriptionStore((state) => state.clear);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const lastActivity = useRef(Date.now());
  const timeoutMinutes = useRef(60);
  const autoLogout = useRef(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    setSidebarOpen((current) => !current);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <button
        type="button"
        onClick={toggleSidebar}
        className="fixed left-4 top-4 z-[60] inline-flex items-center justify-center rounded-xl bg-primary-700 p-3 text-white shadow-lg md:hidden"
        aria-label="Toggle menu"
      >
        ☰
      </button>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
        />
      )}

      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <main
        className={`transition-all duration-300 min-h-screen ${
          sidebarOpen ? 'md:ml-[280px]' : 'md:ml-[80px]'
        } ml-0`}
      >
        <div className="p-4 pt-16 md:p-6 md:pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
