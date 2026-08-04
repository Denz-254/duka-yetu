import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FaFileInvoice, FaDownload, FaCalendarAlt, FaChartBar,
  FaFilter, FaPrint, FaStore, FaShoppingBag, FaMoneyBillWave,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import { formatCurrency, formatDate } from '../utils/helpers';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const ReportsPage = () => {
  const [dateRange, setDateRange] = useState('weekly');
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState([]);
  const [summary, setSummary] = useState({
    total_revenue: 0,
    total_orders: 0,
    average_order_value: 0,
    total_products_sold: 0,
  });
  const [topProducts, setTopProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/reports/summary', { params: { period: dateRange } });
      setSummary({
        total_revenue: data.summary?.total_revenue || 0,
        total_orders: data.summary?.total_orders || 0,
        average_order_value: data.summary?.average_order_value || 0,
        total_products_sold: data.summary?.products_sold || 0,
      });
      setSalesData(data.trend || []);
      setTopProducts(data.top_products || []);
      setRecentOrders(data.recent_orders || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    try {
      const res = await api.get('/reports/download', {
        params: { period: dateRange },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/html' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-report-${dateRange}.html`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch {
      toast.error('Download failed');
    }
  };

  const printReport = () => {
    window.print();
  };

  const summaryCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(summary.total_revenue),
      icon: FaMoneyBillWave,
      color: 'bg-green-50 text-green-600',
    },
    {
      title: 'Total Orders',
      value: summary.total_orders,
      icon: FaShoppingBag,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Average Order Value',
      value: formatCurrency(summary.average_order_value),
      icon: FaChartBar,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Products Sold',
      value: summary.total_products_sold,
      icon: FaStore,
      color: 'bg-orange-50 text-orange-600',
    },
  ];

  const dateOptions = [
    { value: 'today', label: 'Today' },
    { value: 'weekly', label: 'This Week' },
    { value: 'monthly', label: 'This Month' },
    { value: 'yearly', label: 'This Year' },
    { value: 'all', label: 'All time' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaFileInvoice className="text-primary-600" />
            Reports
          </h1>
          <p className="text-gray-500 text-sm mt-1">Live sales data from your store</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={downloadReport} className="btn-secondary flex items-center gap-2">
            <FaDownload /> Export
          </button>
          <button type="button" onClick={printReport} className="btn-primary flex items-center gap-2">
            <FaPrint /> Print
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input-primary py-2 px-3 bg-white text-sm"
            >
              {dateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={fetchReportData} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
            <FaFilter /> {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon className="text-xl" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Revenue Trend</h3>
          <div className="h-64">
            {salesData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16">No sales in this period</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} fill="url(#revenueGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Top Selling Products</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {topProducts.length === 0 && <p className="text-sm text-gray-400">No product sales yet</p>}
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5">{index + 1}.</span>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.quantity} sold</p>
                  </div>
                </div>
                <p className="font-semibold text-primary-600 text-sm">{formatCurrency(product.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Recent Sales</h3>
          <span className="text-xs text-gray-500">{recentOrders.length} shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Receipt</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Method</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Total</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-primary-50/30 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-gray-800">
                    {order.receipt_number || `#${String(order.id).slice(0, 8)}`}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">{formatDate(order.sale_date)}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{order.payment_method || '—'}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-primary-600 text-right">
                    {formatCurrency(order.total_amount)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-600">
                      {order.payment_status || 'PAID'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
