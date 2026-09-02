// frontend/src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FaUsers, FaShoppingBag, FaMoneyBillWave, FaChartLine,
  FaStore, FaMapMarkerAlt, FaEye, FaSignOutAlt, FaUserCircle,
  FaBox, FaExclamationTriangle, FaClock, FaCheckCircle,
  FaHourglassHalf, FaBuilding, FaPhone, FaEnvelope, FaCalendarAlt,
  FaUserFriends, FaReceipt
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../api/client';
import { formatCurrency, formatDate, formatDuration } from '../utils/helpers';
import ShiftClock from '../components/shifts/ShiftClock';
import { shifts } from '../api/endpoints';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    today_sales_count: 0,
    today_revenue: 0,
    total_sales_all_time: 0,
    total_revenue_all_time: 0,
    total_products: 0,
    low_stock_count: 0,
    total_staff: 0,
  });
  
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [weeklySalesData, setWeeklySalesData] = useState([]);
  const [dailyOrdersData, setDailyOrdersData] = useState([]);
  const [shiftRows, setShiftRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const user = useAuthStore((state) => state.user);
  const isOwner = user?.role === 'OWNER';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isOwner) {
        // Owner dashboard - fetch all data
        const [overviewRes, weeklyRes, lowStockRes, productsRes, salesRes, shiftsRes] = await Promise.all([
          api.get('/dashboard/owner/overview'),
          api.get('/dashboard/owner/weekly-sales'),
          api.get('/dashboard/owner/low-stock'),
          api.get('/products/'),
          api.get('/sales/'),
          shifts.list({ limit: 8 }).catch(() => ({ data: [] })),
        ]);
        setShiftRows(shiftsRes.data || []);

        if (overviewRes.data) {
          setStats({
            today_sales_count: overviewRes.data.today_sales_count || 0,
            today_revenue: overviewRes.data.today_revenue || 0,
            total_sales_all_time: overviewRes.data.total_sales_all_time || 0,
            total_revenue_all_time: overviewRes.data.total_revenue_all_time || 0,
            total_products: overviewRes.data.total_products || 0,
            low_stock_count: overviewRes.data.low_stock_count || 0,
            total_staff: overviewRes.data.total_staff || 0,
          });
        }

        if (weeklyRes.data && weeklyRes.data.data) {
          setWeeklySalesData(weeklyRes.data.data);
        }

        if (lowStockRes.data && lowStockRes.data.items) {
          setLowStock(lowStockRes.data.items);
        }

        if (productsRes.data && productsRes.data.items) {
          // Process products for top selling
          const productImageMap = {};
          productsRes.data.items.forEach(p => {
            productImageMap[p.id] = p.image_url;
          });

          if (salesRes.data && salesRes.data.items) {
            const productSales = {};
            salesRes.data.items.forEach(sale => {
              if (sale.items) {
                sale.items.forEach(item => {
                  if (!productSales[item.product_id]) {
                    productSales[item.product_id] = {
                      name: item.product_name,
                      sku: item.sku,
                      image_url: productImageMap[item.product_id] || null,
                      quantity: 0,
                      revenue: 0,
                    };
                  }
                  productSales[item.product_id].quantity += item.quantity;
                  productSales[item.product_id].revenue += item.subtotal;
                });
              }
            });
            
            const sortedProducts = Object.values(productSales)
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 5);
            setTopProducts(sortedProducts);
          }

          if (salesRes.data && salesRes.data.items) {
            setRecentOrders(salesRes.data.items.slice(0, 5));
          }

          if (weeklyRes.data && weeklyRes.data.data) {
            setDailyOrdersData(weeklyRes.data.data.map(day => ({
              ...day,
              orders: day.sales_count || 0,
            })));
          }
        }
      } else {
        // Cashier dashboard - fetch only cashier data
        const [cashierRes, salesRes] = await Promise.all([
          api.get('/dashboard/cashier/overview'),
          api.get('/sales/')
        ]);

        if (cashierRes.data) {
          setStats({
            today_sales_count: cashierRes.data.today_sales_count || 0,
            today_revenue: cashierRes.data.today_revenue || 0,
            total_sales_all_time: cashierRes.data.total_sales_all_time || 0,
            total_revenue_all_time: cashierRes.data.total_revenue_all_time || 0,
            total_products: 0,
            low_stock_count: 0,
            total_staff: 0,
          });
        }

        if (salesRes.data && salesRes.data.items) {
          setRecentOrders(salesRes.data.items.slice(0, 5));
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      setError('Failed to load dashboard data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'cancelled':
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const statCards = isOwner ? [
    {
      title: "Today's Sales",
      value: stats.today_sales_count,
      icon: FaShoppingBag,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(stats.today_revenue),
      icon: FaMoneyBillWave,
      color: 'text-green-600 bg-green-50',
    },
    {
      title: 'Total Products',
      value: stats.total_products,
      icon: FaBox,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      title: 'Staff Members',
      value: stats.total_staff,
      icon: FaUsers,
      color: 'text-orange-600 bg-orange-50',
    },
  ] : [
    {
      title: "Today's Sales",
      value: stats.today_sales_count,
      icon: FaShoppingBag,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(stats.today_revenue),
      icon: FaMoneyBillWave,
      color: 'text-green-600 bg-green-50',
    },
    {
      title: 'Total Sales',
      value: stats.total_sales_all_time,
      icon: FaReceipt,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.total_revenue_all_time),
      icon: FaChartLine,
      color: 'text-orange-600 bg-orange-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchDashboardData} 
          className="mt-3 text-primary-600 hover:text-primary-700 font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="dashboard-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back, {user?.name || 'User'}! Here's what's happening with your business today.
          </p>
        </div>
        <div className="dashboard-date-chip flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-100">
          <FaCalendarAlt />
          <span>May 6 - May 12, 2025</span>
        </div>
      </div>

      {!isOwner && <ShiftClock />}

      {isOwner && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <FaClock className="text-primary-600" /> Cashier shifts
              </h3>
              <p className="text-xs text-gray-400 mt-1">Who clocked in, opening cash, clock-out, and money made</p>
            </div>
            <Link to="/shifts" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all
            </Link>
          </div>
          {shiftRows.length === 0 ? (
            <p className="text-center text-gray-400 py-6">No shifts yet. Cashiers clock in from POS before selling.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-400 border-b border-gray-50">
                    <th className="pb-2 pr-3">Cashier</th>
                    <th className="pb-2 pr-3">In</th>
                    <th className="pb-2 pr-3">Opening</th>
                    <th className="pb-2 pr-3">Out</th>
                    <th className="pb-2 pr-3">Closing</th>
                    <th className="pb-2 pr-3">Made</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftRows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-3">
                        <p className="text-sm font-medium text-gray-800">{row.cashier_name}</p>
                        <p className="text-xs text-gray-400">{formatDuration(row.duration_minutes)}</p>
                      </td>
                      <td className="py-2 pr-3 text-sm text-gray-600">{formatDate(row.opened_at)}</td>
                      <td className="py-2 pr-3 text-sm font-semibold text-gray-800">{formatCurrency(row.opening_cash)}</td>
                      <td className="py-2 pr-3 text-sm text-gray-600">{row.closed_at ? formatDate(row.closed_at) : 'Open'}</td>
                      <td className="py-2 pr-3 text-sm font-semibold text-gray-800">
                        {row.closing_cash != null ? formatCurrency(row.closing_cash) : '—'}
                      </td>
                      <td className="py-2 pr-3 text-sm font-bold text-primary-700">{formatCurrency(row.total_sales)}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          row.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="text-xl" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts - Only for Owner */}
      {isOwner && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">This Week</h3>
              <span className="text-xs text-gray-500">May 6 - May 12, 2025</span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklySalesData}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} fill="url(#incomeGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">Daily Order Counts</h3>
              <span className="text-sm text-gray-500">Total: {stats.total_sales_all_time}</span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyOrdersData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => `${value} orders`} />
                  <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      )}

      {/* Business Overview - Owner Only */}
      {isOwner && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-1"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-50 rounded-lg">
                <FaBuilding className="text-primary-600 text-xl" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Business Overview</h3>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <FaMapMarkerAlt className="text-xs" />
                  <span>Nairobi, Kenya</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Owner</span>
                <span className="text-gray-700 font-medium">{user?.name || 'John Doe'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-700 truncate max-w-[150px]">{user?.email || 'john@duka.com'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Phone</span>
                <span className="text-gray-700">{user?.phone || '+254 712 345 678'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-500">Joined</span>
                <span className="text-gray-700">Jan 2025</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2"
          >
            <h3 className="text-sm font-medium text-gray-700 mb-4">Top Selling Products</h3>
            <div className="space-y-4">
              {topProducts.length === 0 ? (
                <p className="text-center text-gray-400 py-4">No products sold yet</p>
              ) : (
                topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-5">{index + 1}.</span>
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover bg-gray-50 border border-gray-100" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-100">
                          <FaBox />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.quantity} sold</p>
                      </div>
                    </div>
                    <p className="font-semibold text-primary-600 text-sm">{formatCurrency(product.revenue)}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-sm font-medium text-gray-700 mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="text-center text-gray-400 py-4">No orders yet</p>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{order.receipt_number || `Order #${order.id.slice(0, 8)}`}</p>
                    <p className="text-xs text-gray-400">{formatDate(order.sale_date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.payment_status)}`}>
                      {order.payment_status || 'Completed'}
                    </span>
                    <p className="text-sm font-medium text-gray-700">{formatCurrency(order.total_amount)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Low Stock - Owner Only */}
        {isOwner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <FaExclamationTriangle className="text-red-500" />
              <h3 className="text-sm font-medium text-gray-700">Low Stock Alerts</h3>
            </div>
            <div className="space-y-3">
              {lowStock.length === 0 ? (
                <p className="text-center text-gray-400 py-4">All products are well stocked</p>
              ) : (
                lowStock.map((product, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.current_stock} items left</p>
                    </div>
                    <p className="text-sm font-medium text-red-600">{formatCurrency(product.selling_price)}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;