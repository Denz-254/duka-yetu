import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaMobileAlt } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import useMarketCartStore from '../store/marketCartStore';
import { formatCurrency } from '../utils/helpers';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MarketplaceCheckoutPage = () => {
  const { items, updateQuantity, removeItem, clearCart, total } = useMarketCartStore();
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    delivery_address: '',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [orderResult, setOrderResult] = useState(null);

  const sellers = [...new Set(items.map((item) => item.business_id))];

  const pay = async () => {
    if (!items.length) return toast.error('Cart is empty');
    if (sellers.length > 1) {
      return toast.error('Checkout one seller at a time. Remove items from other shops.');
    }
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      return toast.error('Name and M-Pesa phone are required');
    }

    setLoading(true);
    setStatus('Sending M-Pesa STK Push...');
    try {
      const { data } = await api.post('/marketplace/checkout', {
        ...form,
        items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      }, { timeout: 45000 });

      toast.success(data.customer_message || 'STK Push sent');
      setStatus('Waiting for M-Pesa PIN confirmation...');

      for (let i = 0; i < 40; i += 1) {
        const { data: order } = await api.get(`/marketplace/orders/${data.order_id}`);
        if (order.payment_status === 'PAID') {
          setOrderResult(order);
          clearCart();
          setStatus('');
          toast.success('Payment successful!');
          return;
        }
        if (order.payment_status === 'FAILED') {
          throw new Error('Payment failed or was cancelled');
        }
        await sleep(3000);
      }
      throw new Error('Timed out waiting for payment confirmation');
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Checkout failed');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  if (orderResult) {
    return (
      <div className="min-h-screen bg-[#f1f1f2] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-green-700">Order Paid</h1>
          <p className="text-gray-600 mt-2">{orderResult.order_number}</p>
          <p className="text-gray-800 font-bold mt-4">{formatCurrency(orderResult.total_amount)}</p>
          <p className="text-sm text-gray-500 mt-2">
            Seller: {orderResult.business_name}. Receipt: {orderResult.mpesa_receipt_number || '—'}
          </p>
          <Link to="/shop" className="inline-block mt-6 px-4 py-2 rounded-md bg-[#f68b1e] text-white font-semibold">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f1f2]">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link to="/shop" className="inline-flex items-center gap-2 text-gray-600 mb-4">
          <FaArrowLeft /> Back to shop
        </Link>
        <div className="grid md:grid-cols-5 gap-4">
          <div className="md:col-span-3 bg-white rounded-lg shadow-sm p-4 space-y-3">
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
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-2 border rounded">-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2 border rounded">+</button>
                    <button onClick={() => removeItem(item.id)} className="text-xs text-red-500 ml-2">Remove</button>
                  </div>
                </div>
                <p className="font-semibold">{formatCurrency(item.selling_price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="md:col-span-2 bg-white rounded-lg shadow-sm p-4 space-y-3 h-fit">
            <h2 className="font-bold text-gray-800">Checkout</h2>
            {sellers.length > 1 && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                Remove items from other sellers — one shop per checkout for now.
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
              placeholder="Email (optional)"
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
