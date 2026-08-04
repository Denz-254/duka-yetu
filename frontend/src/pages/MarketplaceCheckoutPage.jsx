import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FaArrowLeft, FaDownload, FaMobileAlt } from 'react-icons/fa';
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

    setLoading(true);
    setStatus('Sending STK Push...');
    try {
      const { data } = await api.post('/marketplace/checkout', {
        ...form,
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
    <div className="min-h-screen bg-gray-50">
      <Seo title="Checkout | DukaMall" description="Pay securely with M-Pesa on DukaMall." path="/shop/checkout" />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link to="/shop" className="inline-flex items-center gap-2 text-gray-600 mb-4">
          <FaArrowLeft /> Back to shop
        </Link>
        <p className="text-xs text-gray-500 mb-3">
          Signed in as {user?.name || user?.email} ·{' '}
          <Link to="/shop/register" className="text-primary-600">Shopper accounts</Link>
        </p>
        <div className="grid md:grid-cols-5 gap-4">
          <div className="md:col-span-3 bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-3">
            <h2 className="font-bold text-gray-800">Cart ({items.length})</h2>
            {items.length === 0 && <p className="text-gray-400 py-8 text-center">Your cart is empty</p>}
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 border-b border-gray-100 pb-3">
                <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
                  {item.image_url && <img src={item.image_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.business_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-2 border rounded">-</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2 border rounded">+</button>
                    <button type="button" onClick={() => removeItem(item.id)} className="text-xs text-red-500 ml-2">Remove</button>
                  </div>
                </div>
                <p className="font-semibold">{formatCurrency(item.selling_price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-3 h-fit">
            <h2 className="font-bold text-gray-800">Checkout</h2>
            {sellers.length > 1 && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                One seller per checkout — remove other shops&apos; items.
              </p>
            )}
            <input
              className="input-primary bg-white text-gray-800"
              placeholder="Full name"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            />
            <input
              className="input-primary bg-white text-gray-800"
              placeholder="M-Pesa phone 07XXXXXXXX"
              value={form.customer_phone}
              onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
            />
            <input
              className="input-primary bg-white text-gray-800"
              placeholder="Email (for invoice & updates)"
              value={form.customer_email}
              onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
            />
            <textarea
              className="input-primary bg-white text-gray-800"
              placeholder="Delivery address"
              rows={3}
              value={form.delivery_address}
              onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
            />
            <div className="flex justify-between font-bold text-lg border-t pt-3">
              <span>Total</span>
              <span>{formatCurrency(total())}</span>
            </div>
            {status && <p className="text-xs text-green-700">{status}</p>}
            <button
              type="button"
              disabled={loading || !items.length}
              onClick={pay}
              className="w-full py-3 rounded-md bg-green-600 hover:bg-green-700 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <FaMobileAlt />
              {loading ? 'Waiting for M-Pesa...' : 'Pay with M-Pesa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceCheckoutPage;
