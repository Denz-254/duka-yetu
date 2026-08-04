import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaStore, FaCheck, FaTimes, FaSync, FaSignOutAlt, FaShieldAlt,
  FaStar, FaSearch, FaTrash,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import { formatCurrency, formatDate } from '../utils/helpers';

const SuperAdminDashboard = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState([]);
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [featureDays, setFeatureDays] = useState(7);
  const [badgeText, setBadgeText] = useState('Featured');
  const [featLoading, setFeatLoading] = useState(false);

  const loadFeatured = async () => {
    try {
      const { data } = await api.get('/admin/products', { params: { featured_only: true, limit: 30 } });
      setFeatured(data || []);
    } catch {
      setFeatured([]);
    }
  };

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
      await loadFeatured();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const searchProducts = async (e) => {
    e?.preventDefault?.();
    if (!productQuery.trim()) {
      setProductResults([]);
      return;
    }
    try {
      const { data } = await api.get('/admin/products', { params: { q: productQuery.trim(), limit: 20 } });
      setProductResults(data || []);
    } catch {
      toast.error('Search failed');
    }
  };

  const featureProduct = async (productId) => {
    setFeatLoading(true);
    try {
      await api.post(`/admin/featured/${productId}`, { days: featureDays, badge_text: badgeText || 'Featured' });
      toast.success('Added to hero');
      setProductResults([]);
      setProductQuery('');
      await loadFeatured();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Feature failed');
    } finally {
      setFeatLoading(false);
    }
  };

  const unfeature = async (productId) => {
    try {
      await api.delete(`/admin/featured/${productId}`);
      toast.success('Removed from hero');
      await loadFeatured();
    } catch {
      toast.error('Remove failed');
    }
  };

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
    navigate('/login', { replace: true });
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
          <button type="button" onClick={load} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center gap-2">
            <FaSync /> Refresh
          </button>
          <button type="button" onClick={handleLogout} className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 flex items-center gap-2">
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

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-1">
            <FaStar className="text-amber-500" /> Store hero featured products
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Add products for clients who paid for hero placement. Sellers may also self-feature via Products.
          </p>
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <form onSubmit={searchProducts} className="md:col-span-2 flex gap-2">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} className="input-primary pl-9" placeholder="Search product, SKU, or shop..." />
              </div>
              <button type="submit" className="btn-primary">Search</button>
            </form>
            <div className="flex gap-2">
              <input type="number" min={1} max={90} value={featureDays} onChange={(e) => setFeatureDays(parseInt(e.target.value, 10) || 7)} className="input-primary w-24" title="Days" />
              <input value={badgeText} onChange={(e) => setBadgeText(e.target.value)} className="input-primary flex-1" placeholder="Badge text" />
            </div>
          </div>
          {productResults.length > 0 && (
            <div className="border border-gray-100 rounded-lg divide-y mb-4 max-h-56 overflow-y-auto">
              {productResults.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    {p.image_url ? <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover" /> : <div className="w-10 h-10 rounded bg-gray-100" />}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 truncate">{p.business_name} · {formatCurrency(p.selling_price)}</p>
                    </div>
                  </div>
                  <button type="button" disabled={featLoading} onClick={() => featureProduct(p.id)} className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1">
                    <FaStar /> Feature
                  </button>
                </div>
              ))}
            </div>
          )}
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Active on hero ({featured.length})</h3>
          {featured.length === 0 ? (
            <p className="text-sm text-gray-400">No featured products yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {featured.map((p) => (
                <div key={p.id} className="flex items-center gap-3 border border-gray-100 rounded-lg p-3">
                  {p.image_url ? <img src={p.image_url} alt="" className="w-14 h-14 rounded-lg object-cover" /> : <div className="w-14 h-14 rounded-lg bg-gray-100" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-gray-400 truncate">{p.business_name}</p>
                  </div>
                  <button type="button" onClick={() => unfeature(p.id)} className="p-2 text-gray-400 hover:text-red-500"><FaTrash /></button>
                </div>
              ))}
            </div>
          )}
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
                  <span className="font-medium">KES {order.total_amount} · {order.payment_status}</span>
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
                <button key={status || 'ALL'} type="button" onClick={() => setFilter(status)} className={`px-3 py-1.5 rounded-lg text-sm ${filter === status ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
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
                    <p className="text-sm text-gray-500">{biz.owner_name} · {biz.email} · {biz.phone}</p>
                    <p className="text-xs text-gray-400 mt-1">Registered {formatDate(biz.created_at)} · {biz.package} · {biz.products_count} products</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${biz.approval_status === 'APPROVED' ? 'bg-green-100 text-green-700' : biz.approval_status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{biz.approval_status}</span>
                    {biz.approval_status !== 'APPROVED' && (
                      <button type="button" onClick={() => approve(biz.id)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm flex items-center gap-1"><FaCheck /> Approve</button>
                    )}
                    {biz.approval_status !== 'REJECTED' && (
                      <button type="button" onClick={() => reject(biz.id)} className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm flex items-center gap-1"><FaTimes /> Reject</button>
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
