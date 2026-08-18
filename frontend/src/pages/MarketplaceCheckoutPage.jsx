import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaDownload,
  FaMobileAlt,
  FaMapMarkerAlt,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaCheckCircle,
  FaShoppingBag,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import useMarketCartStore from '../store/marketCartStore';
import useAuthStore from '../store/authStore';
import { formatCurrency } from '../utils/helpers';
import Seo from '../components/common/Seo';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shortErr = (e) => {
  const d = e?.response?.data?.detail || e?.message || 'Checkout failed';
  return typeof d === 'string' ? (d.length > 48 ? `${d.slice(0, 47)}…` : d) : 'Checkout failed';
};

const MarketplaceCheckoutPage = () => {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { items, updateQuantity, removeItem, clearCart, total } = useMarketCartStore();
  const [form, setForm] = useState({
    customer_name: user?.name || '',
    customer_phone: user?.phone || '',
    customer_email: user?.email || '',
    delivery_address: '',
    delivery_city: '',
    delivery_county: '',
    delivery_landmark: '',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [orderResult, setOrderResult] = useState(null);

  // Must register / login as shopper (or any user) before paying online
  if (!isAuthenticated) {
    return <Navigate to="/shop/register" replace state={{ from: '/shop/checkout' }} />;
  }

  const sellers = [...new Set(items.map((item) => item.business_id))];

  const downloadInvoice = async () => {
    if (!orderResult?.order_id) return;
    try {
      const res = await api.get(`/marketplace/orders/${orderResult.order_id}/invoice`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/html' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderResult.order_number || 'order'}.html`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Invoice download failed');
    }
  };

  const pay = async () => {
    if (!items.length) return toast.error('Cart is empty');
    if (sellers.length > 1) {
      return toast.error('One seller per checkout');
    }
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      return toast.error('Name and phone required');
    }
    if (!form.delivery_address.trim() || !form.delivery_city.trim() || !form.delivery_county.trim()) {
      return toast.error('Delivery address, city and county are required');
    }

    setLoading(true);
    setStatus('Sending STK Push...');
    try {
      const { data } = await api.post('/marketplace/checkout', {
        ...form,
        delivery_address: [
          form.delivery_address,
          form.delivery_city,
          form.delivery_county,
          form.delivery_landmark,
        ].filter(Boolean).join(', '),
        items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      }, { timeout: 45000 });

      toast.success('Check phone for PIN');
      setStatus('Waiting for M-Pesa PIN...');

      for (let i = 0; i < 40; i += 1) {
        const { data: order } = await api.get(`/marketplace/orders/${data.order_id}`);
        if (order.payment_status === 'PAID') {
          setOrderResult(order);
          clearCart();
          setStatus('');
          toast.success('Payment successful');
          return;
        }
        if (order.payment_status === 'FAILED') {
          throw new Error('Payment cancelled');
        }
        await sleep(3000);
      }
      throw new Error('Payment timed out');
    } catch (error) {
      toast.error(shortErr(error));
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  if (orderResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Seo title="Order paid | DukaMall" path="/shop/checkout" noIndex />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-green-700">Order Paid</h1>
          <p className="text-gray-600 mt-2">{orderResult.order_number}</p>
          <p className="text-gray-800 font-bold mt-4">{formatCurrency(orderResult.total_amount)}</p>
          <p className="text-sm text-gray-500 mt-2">
            Seller: {orderResult.business_name}. Receipt: {orderResult.mpesa_receipt_number || '—'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
            <button
              type="button"
              onClick={downloadInvoice}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-gray-900 text-gray-900 font-semibold text-sm hover:bg-gray-900 hover:text-white"
            >
              <FaDownload /> Download Invoice
            </button>
            <Link to="/shop" className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-orange-500 text-white font-semibold text-sm">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-shell">
      <Seo title="Checkout | DukaMall" description="Pay securely with M-Pesa on DukaMall." path="/shop/checkout" />

      <div className="checkout-inner">
        <div className="checkout-toolbar">
          <Link to="/shop" className="checkout-back">
            <FaArrowLeft /> Back to shop
          </Link>
          <p className="checkout-account">
            Signed in as {user?.name || user?.email} ·{' '}
            <Link to="/shop/register">Shopper accounts</Link>
          </p>
        </div>

        <div className="checkout-grid">
          <section className="checkout-panel checkout-panel--cart">
            <div className="checkout-panel__header">
              <div>
                <p className="checkout-kicker">Your cart</p>
                <h2>{items.length} item{items.length === 1 ? '' : 's'}</h2>
              </div>
              <span className="checkout-chip"><FaShoppingBag /> {items.length}</span>
            </div>

            {items.length === 0 && <p className="checkout-empty">Your cart is empty</p>}

            {items.map((item) => (
              <div key={item.id} className="checkout-item">
                <div className="checkout-item__image">
                  {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />}
                </div>

                <div className="checkout-item__body">
                  <div>
                    <p className="checkout-item__name">{item.name}</p>
                    <p className="checkout-item__merchant">{item.business_name}</p>
                  </div>

                  <div className="checkout-item__controls">
                    <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity">-</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Increase quantity">+</button>
                    <button type="button" className="checkout-remove" onClick={() => removeItem(item.id)}>Remove</button>
                  </div>
                </div>

                <p className="checkout-item__price">{formatCurrency(item.selling_price * item.quantity)}</p>
              </div>
            ))}
          </section>

          <aside className="checkout-panel checkout-panel--summary">
            <div className="checkout-panel__header">
              <div>
                <p className="checkout-kicker">Delivery details</p>
                <h2>Checkout</h2>
              </div>
            </div>

            {sellers.length > 1 && (
              <p className="checkout-alert">
                One seller per checkout — remove other shops&apos; items.
              </p>
            )}

            <div className="checkout-form">
              <label className="checkout-field">
                <span>Full name</span>
                <div className="checkout-input-wrap">
                  <FaUser className="checkout-input-icon" />
                  <input
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    placeholder="Full name"
                  />
                </div>
              </label>

              <label className="checkout-field">
                <span>Phone</span>
                <div className="checkout-input-wrap">
                  <FaPhone className="checkout-input-icon" />
                  <input
                    value={form.customer_phone}
                    onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                    placeholder="07XXXXXXXX"
                  />
                </div>
              </label>

              <label className="checkout-field">
                <span>Email</span>
                <div className="checkout-input-wrap">
                  <FaEnvelope className="checkout-input-icon" />
                  <input
                    value={form.customer_email}
                    onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                    placeholder="Email for invoice"
                  />
                </div>
              </label>

              <label className="checkout-field">
                <span>Street address</span>
                <div className="checkout-input-wrap">
                  <FaMapMarkerAlt className="checkout-input-icon" />
                  <input
                    value={form.delivery_address}
                    onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                    placeholder="House number / street"
                  />
                </div>
              </label>

              <div className="checkout-double-fields">
                <label className="checkout-field">
                  <span>City</span>
                  <input
                    value={form.delivery_city}
                    onChange={(e) => setForm({ ...form, delivery_city: e.target.value })}
                    placeholder="Nairobi"
                  />
                </label>

                <label className="checkout-field">
                  <span>County</span>
                  <input
                    value={form.delivery_county}
                    onChange={(e) => setForm({ ...form, delivery_county: e.target.value })}
                    placeholder="Nairobi County"
                  />
                </label>
              </div>

              <label className="checkout-field">
                <span>Landmark / notes</span>
                <textarea
                  rows={3}
                  value={form.delivery_landmark}
                  onChange={(e) => setForm({ ...form, delivery_landmark: e.target.value })}
                  placeholder="Near the market, gate, apartment block, etc."
                />
              </label>
            </div>

            <div className="checkout-summary">
              <div className="checkout-summary__row">
                <span>Subtotal</span>
                <strong>{formatCurrency(total())}</strong>
              </div>
              <div className="checkout-summary__row">
                <span>Delivery</span>
                <strong>Calculated at checkout</strong>
              </div>
              <div className="checkout-summary__row checkout-summary__row--total">
                <span>Total</span>
                <strong>{formatCurrency(total())}</strong>
              </div>
            </div>

            {status && (
              <div className="checkout-status">
                <FaCheckCircle /> {status}
              </div>
            )}

            <button
              type="button"
              disabled={loading || !items.length}
              onClick={pay}
              className="checkout-pay"
            >
              <FaMobileAlt />
              {loading ? 'Waiting for M-Pesa...' : 'Pay with M-Pesa'}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceCheckoutPage;
