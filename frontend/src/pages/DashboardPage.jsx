import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FaUsers, 
  FaShoppingBag, 
  FaMoneyBillWave, 
  FaChartLine,
  FaStore,
  FaMapMarkerAlt,
  FaEye,
  FaSignOutAlt,
  FaUserCircle,
  FaBox,
  FaExclamationTriangle,
  FaClock,
  FaCheckCircle,
  FaHourglassHalf,
  FaArrowUp,
  FaArrowDown,
  FaBuilding,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../api/client';
import { formatCurrency, formatDate } from '../utils/helpers';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    unique_phone_numbers: 0,
    phone_growth: 12.5,
    total_valid_orders: 0,
    orders_change: 0,
    valid_orders_today: 0,
    valid_orders_change: 15.2,
    daily_income: 0,
    income_change: 18.6,
    total_orders: 0,
    orders_growth: 8.3,
  });
  
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [weeklySalesData, setWeeklySalesData] = useState([]);
  const [dailyOrdersData, setDailyOrdersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);

  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch real data from backend
      const [overviewRes, weeklyRes, lowStockRes, productsRes, salesRes] = await Promise.all([
        api.get('/dashboard/owner/overview'),
        api.get('/dashboard/owner/weekly-sales'),
        api.get('/dashboard/owner/low-stock'),
        api.get('/products/'),
        api.get('/sales/')
      ]);

      // Store products for image lookup
      if (productsRes.data && productsRes.data.items) {
        setProducts(productsRes.data.items);
      }

      // Update stats from real data
      if (overviewRes.data) {
        setStats({
          ...stats,
          total_valid_orders: overviewRes.data.total_sales_all_time || 0,
          valid_orders_today: overviewRes.data.today_sales_count || 0,
          daily_income: overviewRes.data.today_revenue || 0,
          total_orders: overviewRes.data.total_sales_all_time || 0,
          unique_phone_numbers: overviewRes.data.total_staff || 0,
        });
      }

      // Weekly sales for chart
      if (weeklyRes.data && weeklyRes.data.data) {
        setWeeklySalesData(weeklyRes.data.data);
      }

      // Low stock alerts
      if (lowStockRes.data && lowStockRes.data.items) {
        setLowStock(lowStockRes.data.items);
      }

      // Top selling products - calculate from sales data with images from products
      if (salesRes.data && salesRes.data.items) {
        // Create a map of product images
        const productImageMap = {};
        if (productsRes.data && productsRes.data.items) {
          productsRes.data.items.forEach(p => {
            productImageMap[p.id] = p.image_url;
          });
        }

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

      // Recent orders
      if (salesRes.data && salesRes.data.items) {
        setRecentOrders(salesRes.data.items.slice(0, 5));
      }

      // Daily orders for chart
      if (weeklyRes.data && weeklyRes.data.data) {
        setDailyOrdersData(weeklyRes.data.data.map(day => ({
          ...day,
          orders: day.sales_count || 0,
        })));
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

  const statCards = [
    {
      title: 'Unique Phone Numbers',
      value: stats.unique_phone_numbers,
      icon: FaUsers,
      change: `+${stats.phone_growth}%`,
      changeType: 'positive',
      period: 'vs last 7 days',
    },
    {
      title: 'Total Valid Orders',
      value: stats.total_valid_orders,
      icon: FaShoppingBag,
      change: `${stats.orders_change}%`,
      changeType: stats.orders_change >= 0 ? 'positive' : 'negative',
      period: 'vs yesterday',
    },
    {
      title: 'Valid Orders Today',
      value: stats.valid_orders_today,
      icon: FaChartLine,
      change: `+${stats.valid_orders_change}%`,
      changeType: 'positive',
      period: 'vs yesterday',
    },
    {
      title: 'Daily Income',
      value: formatCurrency(stats.daily_income),
      icon: FaMoneyBillWave,
      change: `+${stats.income_change}%`,
      changeType: 'positive',
      period: 'vs last week',
      primary: true,
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
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchDashboardData} 
          className="mt-2 text-primary-600 hover:text-primary-700 font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back, {user?.name || 'John'}! Here's what's happening with your business today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-100">
          <FaCalendarAlt />
          <span>May 6 - May 12, 2025</span>
        </div>
      </div>

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
              className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${
                stat.primary ? 'border-l-4 border-l-primary-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className={`text-2xl font-bold text-gray-800 mt-1 ${stat.primary ? 'text-primary-600' : ''}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${stat.primary ? 'bg-primary-50' : 'bg-gray-50'}`}>
                  <Icon className={`${stat.primary ? 'text-primary-600' : 'text-gray-400'}`} />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <span className={stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}>
                  {stat.change}
                </span>
                <span className="text-gray-400">{stat.period}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts */}
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
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#059669" 
                  strokeWidth={2}
                  fill="url(#incomeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-gray-500">
              Total: {formatCurrency(weeklySalesData.reduce((sum, d) => sum + d.revenue, 0))}
            </span>
            <span className="text-sm text-green-600">+18.6% vs last week</span>
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
            <span className="text-sm text-gray-500">Total: {stats.total_orders}</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyOrdersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value) => `${value} orders`}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-gray-500">+8.3% vs last week</span>
            <span className="text-sm text-gray-500">Orders: {stats.total_orders}</span>
          </div>
        </motion.div>
      </div>

      {/* Business Overview and Top Products */}
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
          <button className="w-full mt-4 text-primary-600 text-sm font-medium hover:text-primary-700 transition-colors text-center">
            View Profile →
          </button>
        </motion.div>

        {/* Top Selling Products */}
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
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="w-12 h-12 rounded-lg object-cover bg-gray-50 border border-gray-100"
                      />
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

      {/* Recent Orders and Low Stock */}
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
      </div>
    </div>
  );
};

export default DashboardPage;