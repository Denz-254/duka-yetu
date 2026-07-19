import { useEffect, useState } from 'react';
import { FaBoxOpen, FaSync } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import { formatCurrency, formatDate } from '../utils/helpers';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = filter ? { fulfillment_status: filter } : {};
      const [ordersRes, notesRes] = await Promise.all([
        api.get('/orders/', { params }),
        api.get('/orders/notifications'),
      ]);
      setOrders(ordersRes.data || []);
      setNotifications(notesRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [filter]);

  const updateStatus = async (id, fulfillment_status) => {
    try {
      await api.patch(`/orders/${id}/fulfillment`, { fulfillment_status });
      toast.success(`Marked ${fulfillment_status}`);
      load();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Update failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaBoxOpen className="text-primary-600" /> Online Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Marketplace orders as they flow — paid, pending, processing, delivered
          </p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2">
          <FaSync /> Refresh
        </button>
      </div>

      {notifications.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <h2 className="font-semibold text-amber-800 mb-2">Latest notifications</h2>
          <div className="space-y-2">
            {notifications.slice(0, 5).map((note) => (
              <div key={note.id} className="text-sm text-amber-900">
                <span className="font-medium">{note.title}:</span> {note.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {['', 'PENDING', 'PROCESSING', 'DELIVERED', 'CANCELLED'].map((status) => (
          <button
            key={status || 'ALL'}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              filter === status ? 'bg-primary-600 text-white' : 'bg-white border text-gray-600'
            }`}
          >
            {status || 'ALL'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No online orders yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {orders.map((order) => (
              <div key={order.id} className="p-4 space-y-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-800">{order.order_number}</p>
                    <p className="text-sm text-gray-500">
                      {order.customer_name} · {order.customer_phone} · {formatDate(order.created_at)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {(order.items || []).map((i) => `${i.name} x${i.quantity}`).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600">{formatCurrency(order.total_amount)}</p>
                    <p className="text-xs text-gray-500">
                      Payout {formatCurrency(order.business_payout)} · Fee {formatCurrency(order.commission_amount)}
                    </p>
                    <div className="flex gap-2 justify-end mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.payment_status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>{order.payment_status}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        {order.fulfillment_status}
                      </span>
                    </div>
                  </div>
                </div>
                {order.payment_status === 'PAID' && order.fulfillment_status !== 'DELIVERED' && (
                  <div className="flex gap-2">
                    {order.fulfillment_status !== 'PROCESSING' && (
                      <button onClick={() => updateStatus(order.id, 'PROCESSING')} className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white">
                        Mark Processing
                      </button>
                    )}
                    <button onClick={() => updateStatus(order.id, 'DELIVERED')} className="text-xs px-3 py-1.5 rounded bg-emerald-600 text-white">
                      Mark Delivered
                    </button>
                    <button onClick={() => updateStatus(order.id, 'CANCELLED')} className="text-xs px-3 py-1.5 rounded bg-red-600 text-white">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
