import { useEffect, useState } from 'react';
import { FaStore, FaCheck, FaTimes, FaSync, FaSignOutAlt, FaShieldAlt } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import { formatDate } from '../utils/helpers';

const SuperAdminDashboard = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [overview, setOverview] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [overviewRes, listRes, notesRes, ordersRes] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/businesses', { params: filter ? { approval_status: filter } : {} }),
        api.get('/admin/notifications'),
        api.get('/admin/orders'),
      ]);
      setOverview(overviewRes.data);
      setBusinesses(listRes.data || []);
      setNotifications(notesRes.data || []);
      setOrders(ordersRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const approve = async (id) => {
    try {
      await api.post(`/admin/businesses/${id}/approve`);
      toast.success('Business approved');
      load();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Approve failed');
    }
  };

  const reject = async (id) => {
    const reason = window.prompt('Rejection reason (optional)') || '';
    try {
      await api.post(`/admin/businesses/${id}/reject`, { reason });
      toast.success('Business rejected');
      load();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Reject failed');
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaShieldAlt className="text-emerald-400 text-2xl" />
          <div>
            <h1 className="text-xl font-bold">Duka Yetu Super Admin</h1>
            <p className="text-sm text-slate-300">{user?.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center gap-2">
            <FaSync /> Refresh
          </button>
          <button onClick={handleLogout} className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 flex items-center gap-2">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            ['Total', overview?.total_businesses],
            ['Pending', overview?.pending_businesses],
            ['Approved', overview?.approved_businesses],
            ['Rejected', overview?.rejected_businesses],
            ['Products', overview?.total_products],
            ['Sales', overview?.total_sales],
          ].map(([label, value]) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{value ?? '—'}</p>
            </div>
          ))}
        </div>

        {notifications.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <h2 className="font-bold text-emerald-800 mb-2">Live marketplace alerts</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notifications.slice(0, 10).map((note) => (
                <div key={note.id} className="text-sm text-emerald-900">
                  <span className="font-medium">{note.title}:</span> {note.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {orders.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="font-bold text-gray-800 mb-3">Recent marketplace orders</h2>
            <div className="space-y-2">
              {orders.slice(0, 8).map((order) => (
                <div key={order.id} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                  <span>{order.order_number} · {order.customer_name}</span>
                  <span className="font-medium">
                    KES {order.total_amount} (fee {order.commission_amount}) · {order.payment_status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <FaStore className="text-primary-600" /> Business Approvals
            </h2>
            <div className="flex gap-2">
              {['PENDING', 'APPROVED', 'REJECTED', ''].map((status) => (
                <button
                  key={status || 'ALL'}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    filter === status ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {status || 'ALL'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : businesses.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No businesses in this filter</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {businesses.map((biz) => (
                <div key={biz.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-800">{biz.name}</p>
                    <p className="text-sm text-gray-500">
                      {biz.owner_name} · {biz.email} · {biz.phone}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Registered {formatDate(biz.created_at)} · {biz.package} · {biz.subscription_status}
                      {' · '}{biz.products_count} products · {biz.sales_count} sales
                    </p>
                    {biz.rejection_reason && (
                      <p className="text-xs text-red-500 mt-1">Reason: {biz.rejection_reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      biz.approval_status === 'APPROVED'
                        ? 'bg-green-100 text-green-700'
                        : biz.approval_status === 'REJECTED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {biz.approval_status}
                    </span>
                    {biz.approval_status !== 'APPROVED' && (
                      <button
                        onClick={() => approve(biz.id)}
                        className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm flex items-center gap-1"
                      >
                        <FaCheck /> Approve
                      </button>
                    )}
                    {biz.approval_status !== 'REJECTED' && (
                      <button
                        onClick={() => reject(biz.id)}
                        className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm flex items-center gap-1"
                      >
                        <FaTimes /> Reject
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
