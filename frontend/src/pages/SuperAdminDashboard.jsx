import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaStore, FaCheck, FaTimes, FaSync, FaSignOutAlt, FaShieldAlt,
  FaStar, FaSearch, FaTrash, FaFileInvoice, FaChartLine, FaMoneyBillWave,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import { formatCurrency, formatDate, downloadBlob } from '../utils/helpers';
import Modal from '../components/common/Modal';

const SuperAdminDashboard = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [analyticsBiz, setAnalyticsBiz] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState([]);
  const [dealOfTheDay, setDealOfTheDay] = useState(null);
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [featureDays, setFeatureDays] = useState(30);
  const [badgeText, setBadgeText] = useState('Featured');
  const [featLoading, setFeatLoading] = useState(false);
  const [dealQuery, setDealQuery] = useState('');
  const [dealResults, setDealResults] = useState([]);
  const [rejectModal, setRejectModal] = useState({ open: false, id: null });
  const [rejectReason, setRejectReason] = useState('');

  const loadFeatured = async () => {
    try {
      const { data } = await api.get('/admin/products', { params: { featured_only: true, limit: 30 } });
      setFeatured(data || []);
    } catch {
      setFeatured([]);
    }
  };

  const loadDealOfTheDay = async () => {
    try {
      const { data } = await api.get('/admin/deal-of-the-day').catch(() => ({ data: null }));
      setDealOfTheDay(data || null);
    } catch {
      setDealOfTheDay(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [overviewRes, listRes, notesRes, ordersRes, analyticsRes] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/businesses', { params: filter ? { approval_status: filter } : {} }),
        api.get('/admin/notifications'),
        api.get('/admin/orders'),
        api.get('/admin/analytics'),
      ]);
      setOverview(overviewRes.data);
      setBusinesses(listRes.data || []);
      setNotifications(notesRes.data || []);
      setOrders(ordersRes.data || []);
      setAnalyticsBiz(analyticsRes.data?.businesses || []);
      await loadFeatured();
      await loadDealOfTheDay();
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

  const searchProductsForDeal = async (e) => {
    e?.preventDefault?.();
    if (!dealQuery.trim()) {
      setDealResults([]);
      return;
    }
    try {
      const { data } = await api.get('/admin/products', { params: { q: dealQuery.trim(), limit: 20 } });
      setDealResults(data || []);
    } catch {
      toast.error('Search failed');
    }
  };

  const featureProduct = async (productId) => {
    setFeatLoading(true);
    try {
      await api.post(`/admin/featured/${productId}`, { days: featureDays, badge_text: badgeText || 'Featured' });
      toast.success('Featured for 1 month (or chosen days)');
      setProductResults([]);
      setProductQuery('');
      await loadFeatured();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Feature failed');
    } finally {
      setFeatLoading(false);
    }
  };

  const setDealProductOfDay = async (productId) => {
    setFeatLoading(true);
    try {
      await api.post(`/admin/deal-of-the-day/${productId}`);
      toast.success('Deal of the Day set successfully');
      setDealResults([]);
      setDealQuery('');
      await loadDealOfTheDay();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to set deal');
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

  const clearDealOfTheDay = async () => {
    try {
      await api.delete('/admin/deal-of-the-day');
      toast.success('Deal cleared');
      await loadDealOfTheDay();
    } catch {
      toast.error('Clear deal failed');
    }
  };

  const changePlan = async (bizId, packageName, subscriptionStatus) => {
    try {
      await api.post(`/admin/businesses/${bizId}/plan`, {
        package: packageName,
        subscription_status: subscriptionStatus,
      });
      toast.success('Plan updated');
      load();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Plan update failed');
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

  const confirmReject = async () => {
    if (!rejectModal.id) return;
    try {
      await api.post(`/admin/businesses/${rejectModal.id}/reject`, { reason: rejectReason || '' });
      toast.success('Business rejected');
      setRejectModal({ open: false, id: null });
      setRejectReason('');
      load();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Reject failed');
    }
  };

  const downloadInvoice = async (bizId, bizName) => {
    try {
      const res = await api.get(`/admin/businesses/${bizId}/subscription-invoice`, {
        params: { billing_cycle: 'monthly' },
        responseType: 'blob',
      });
      downloadBlob(res.data, `invoice-${(bizName || 'business').replace(/\s+/g, '-')}.pdf`);
      toast.success('Invoice downloaded — send to the business');
    } catch {
      toast.error('Invoice failed');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-brand">
          <div className="admin-brand__icon"><FaShieldAlt /></div>
          <div>
            <h1>Duka Yetu Super Admin</h1>
            <p>{user?.username}</p>
          </div>
        </div>
        <div className="admin-actions">
          <button type="button" onClick={load} className="admin-action admin-action--ghost">
            <FaSync /> Refresh
          </button>
          <button type="button" onClick={handleLogout} className="admin-action admin-action--danger">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-stat-grid">
          {[
            ['Businesses', overview?.total_businesses],
            ['Pending', overview?.pending_businesses],
            ['Approved', overview?.approved_businesses],
            ['Shoppers', overview?.shoppers],
            ['POS revenue', overview?.pos_revenue != null ? formatCurrency(overview.pos_revenue) : '—'],
            ['Marketplace', overview?.marketplace_revenue != null ? formatCurrency(overview.marketplace_revenue) : '—'],
            ['Commission', overview?.platform_commission != null ? formatCurrency(overview.platform_commission) : '—'],
            ['Featured live', overview?.featured_active],
          ].map(([label, value]) => (
            <div key={label} className="admin-stat-card">
              <p>{label}</p>
              <strong>{value ?? '—'}</strong>
            </div>
          ))}
        </div>

        <div className="admin-panel">
          <div className="admin-panel__title">
            <h2><FaChartLine /> Business performance</h2>
          </div>
          <p className="admin-panel__subtitle">Sales, online GMV, and commission per registered shop</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Plan</th>
                  <th>POS sales</th>
                  <th>Online</th>
                  <th>Platform cut</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {(analyticsBiz.length ? analyticsBiz : businesses).slice(0, 50).map((biz) => (
                  <tr key={biz.id}>
                    <td data-label="Business">{biz.name}</td>
                    <td data-label="Plan">
                      <div className="flex flex-col gap-2">
                        <select
                          className="input-primary"
                          value={biz.package || 'BASIC'}
                          onChange={(e) => changePlan(biz.id, e.target.value, biz.subscription_status || 'ACTIVE')}
                        >
                          <option value="BASIC">BASIC</option>
                          <option value="PROFESSIONAL">PROFESSIONAL</option>
                          <option value="ENTERPRISE">ENTERPRISE</option>
                        </select>
                        <select
                          className="input-primary"
                          value={biz.subscription_status || 'TRIALING'}
                          onChange={(e) => changePlan(biz.id, biz.package || 'BASIC', e.target.value)}
                        >
                          <option value="TRIALING">Trial</option>
                          <option value="ACTIVE">Active</option>
                          <option value="PAST_DUE">Past due</option>
                          <option value="CANCELED">Canceled</option>
                        </select>
                      </div>
                    </td>
                    <td data-label="POS Sales">{formatCurrency(biz.sales_revenue || 0)} <span>({biz.sales_count || 0})</span></td>
                    <td data-label="Online">{formatCurrency(biz.online_revenue || 0)}</td>
                    <td data-label="Platform Cut" className="admin-table__green">{formatCurrency(biz.platform_commission || 0)}</td>
                    <td data-label="Invoice">
                      <button type="button" onClick={() => downloadInvoice(biz.id, biz.name)} className="admin-table__button">
                        <FaFileInvoice /> Sub invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!analyticsBiz.length && !businesses.length && (
              <p className="admin-empty">No businesses yet</p>
            )}
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel__title">
            <h2><FaStar /> Store hero featured products</h2>
          </div>
          <p className="admin-panel__subtitle">Featured slots last <strong>30 days</strong> by default. Days remaining shown for admin only.</p>
          <div className="admin-feature-controls">
            <form onSubmit={searchProducts} className="admin-search-form">
              <div className="admin-search-box">
                <FaSearch />
                <input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Search product, SKU, or shop..." />
              </div>
              <button type="submit" className="admin-primary-button">Search</button>
            </form>
            <div className="admin-feature-inline">
              <input type="number" min={1} max={90} value={featureDays} onChange={(e) => setFeatureDays(parseInt(e.target.value, 10) || 30)} title="Days" />
              <input value={badgeText} onChange={(e) => setBadgeText(e.target.value)} placeholder="Badge text" />
            </div>
          </div>
          {productResults.length > 0 && (
            <div className="admin-search-results">
              {productResults.map((p) => (
                <div key={p.id} className="admin-search-result">
                  <div className="admin-search-result__meta">
                    {p.image_url ? <img src={p.image_url} alt="" /> : <div className="admin-empty-thumb" />}
                    <div>
                      <p>{p.name}</p>
                      <small>{p.business_name} · {formatCurrency(p.selling_price)}</small>
                    </div>
                  </div>
                  <button type="button" disabled={featLoading} onClick={() => featureProduct(p.id)} className="admin-primary-button admin-primary-button--small">
                    <FaStar /> Feature
                  </button>
                </div>
              ))}
            </div>
          )}
          <h3 className="admin-panel__small-title">Active on hero ({featured.length})</h3>
          {featured.length === 0 ? (
            <p className="admin-empty">No featured products yet.</p>
          ) : (
            <div className="admin-feature-list">
              {featured.map((p) => (
                <div key={p.id} className="admin-feature-item">
                  {p.image_url ? <img src={p.image_url} alt="" /> : <div className="admin-empty-thumb admin-empty-thumb--large" />}
                  <div className="admin-feature-item__meta">
                    <p>{p.name}</p>
                    <small>{p.business_name}</small>
                    <span>
                      {p.days_remaining != null ? `${p.days_remaining} day${p.days_remaining === 1 ? '' : 's'} left` : 'No end date'}
                      {p.featured_until ? ` · until ${formatDate(p.featured_until)}` : ''}
                    </span>
                  </div>
                  <button type="button" onClick={() => unfeature(p.id)} className="admin-remove-button"><FaTrash /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-panel">
          <div className="admin-panel__title">
            <h2><FaStar /> Deal of the Day</h2>
          </div>
          <p className="admin-panel__subtitle">Set a featured product as the daily deal. Updates marketplace promotional banner.</p>
          <div className="admin-feature-controls">
            <form onSubmit={searchProductsForDeal} className="admin-search-form">
              <div className="admin-search-box">
                <FaSearch />
                <input value={dealQuery} onChange={(e) => setDealQuery(e.target.value)} placeholder="Search product for deal..." />
              </div>
              <button type="submit" className="admin-primary-button">Search</button>
            </form>
          </div>
          {dealResults.length > 0 && (
            <div className="admin-search-results">
              {dealResults.map((p) => (
                <div key={p.id} className="admin-search-result">
                  <div className="admin-search-result__meta">
                    {p.image_url ? <img src={p.image_url} alt="" /> : <div className="admin-empty-thumb" />}
                    <div>
                      <p>{p.name}</p>
                      <small>{p.business_name} · {formatCurrency(p.selling_price)}</small>
                    </div>
                  </div>
                  <button type="button" disabled={featLoading} onClick={() => setDealProductOfDay(p.id)} className="admin-primary-button admin-primary-button--small">
                    <FaStar /> Set Deal
                  </button>
                </div>
              ))}
            </div>
          )}
          {dealOfTheDay && (
            <div>
              <h3 className="admin-panel__small-title">Current Deal of the Day</h3>
              <div className="admin-feature-list">
                <div className="admin-feature-item">
                  {dealOfTheDay.image_url ? <img src={dealOfTheDay.image_url} alt="" /> : <div className="admin-empty-thumb admin-empty-thumb--large" />}
                  <div className="admin-feature-item__meta">
                    <p>{dealOfTheDay.name}</p>
                    <small>{dealOfTheDay.business_name}</small>
                    <span>{formatCurrency(dealOfTheDay.selling_price)}</span>
                  </div>
                  <button type="button" onClick={() => clearDealOfTheDay()} className="admin-remove-button"><FaTrash /></button>
                </div>
              </div>
            </div>
          )}
          {!dealOfTheDay && dealResults.length === 0 && (
            <p className="admin-empty admin-empty--large">No deal set. Search and select a product above.</p>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="admin-alert-box">
            <h2>Live marketplace alerts</h2>
            <div className="admin-alert-list">
              {notifications.slice(0, 10).map((note) => (
                <div key={note.id}>
                  <span>{note.title}:</span> {note.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {orders.length > 0 && (
          <div className="admin-panel admin-panel--compact">
            <div className="admin-panel__title">
              <h2><FaMoneyBillWave /> Recent marketplace orders</h2>
            </div>
            <div className="admin-order-list">
              {orders.slice(0, 8).map((order) => (
                <div key={order.id} className="admin-order-item">
                  <span>{order.order_number} · {order.customer_name}</span>
                  <strong>KES {order.total_amount} · {order.payment_status}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="admin-panel admin-panel--table">
          <div className="admin-panel__header">
            <h2><FaStore /> Business approvals</h2>
            <div className="admin-filter-row">
              {['PENDING', 'APPROVED', 'REJECTED', ''].map((status) => (
                <button key={status || 'ALL'} type="button" onClick={() => setFilter(status)} className={`admin-filter ${filter === status ? 'is-active' : ''}`}>
                  {status || 'ALL'}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="admin-empty admin-empty--large">Loading...</div>
          ) : businesses.length === 0 ? (
            <div className="admin-empty admin-empty--large">No businesses in this filter</div>
          ) : (
            <div className="admin-approval-list">
              {businesses.map((biz) => (
                <div key={biz.id} className="admin-approval-item">
                  <div>
                    <p className="admin-approval-name">{biz.name}</p>
                    <p className="admin-approval-meta">{biz.owner_name} · {biz.email} · {biz.phone}</p>
                    <p className="admin-approval-meta admin-approval-meta--small">
                      Registered {formatDate(biz.created_at)} · {biz.package} · {biz.subscription_status} · {biz.products_count} products
                      {biz.sales_revenue != null && ` · POS ${formatCurrency(biz.sales_revenue)}`}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <select
                        className="input-primary"
                        value={biz.package || 'BASIC'}
                        onChange={(e) => changePlan(biz.id, e.target.value, biz.subscription_status || 'ACTIVE')}
                      >
                        <option value="BASIC">BASIC</option>
                        <option value="PROFESSIONAL">PROFESSIONAL</option>
                        <option value="ENTERPRISE">ENTERPRISE</option>
                      </select>
                      <select
                        className="input-primary"
                        value={biz.subscription_status || 'TRIALING'}
                        onChange={(e) => changePlan(biz.id, biz.package || 'BASIC', e.target.value)}
                      >
                        <option value="TRIALING">Trial</option>
                        <option value="ACTIVE">Active</option>
                        <option value="PAST_DUE">Past due</option>
                        <option value="CANCELED">Canceled</option>
                      </select>
                    </div>
                  </div>
                  <div className="admin-approval-actions">
                    <span className={`admin-status ${biz.approval_status === 'APPROVED' ? 'approved' : biz.approval_status === 'REJECTED' ? 'rejected' : 'pending'}`}>{biz.approval_status}</span>
                    {biz.approval_status === 'APPROVED' && (
                      <button type="button" onClick={() => downloadInvoice(biz.id, biz.name)} className="admin-action admin-action--neutral">
                        <FaFileInvoice /> Invoice
                      </button>
                    )}
                    {biz.approval_status !== 'APPROVED' && (
                      <button type="button" onClick={() => approve(biz.id)} className="admin-action admin-action--success"><FaCheck /> Approve</button>
                    )}
                    {biz.approval_status !== 'REJECTED' && (
                      <button type="button" onClick={() => { setRejectModal({ open: true, id: biz.id }); setRejectReason(''); }} className="admin-action admin-action--danger"><FaTimes /> Reject</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Modal
        open={rejectModal.open}
        title="Reject business"
        confirmLabel="Reject"
        danger
        onClose={() => setRejectModal({ open: false, id: null })}
        onConfirm={confirmReject}
      >
        <p className="mb-3">Optional reason sent for your records:</p>
        <textarea
          className="input-primary w-full bg-white text-gray-800"
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason (optional)"
        />
      </Modal>
    </div>
  );
};

export default SuperAdminDashboard;
