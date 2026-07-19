import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaShoppingCart, FaMoneyBillWave, FaReceipt, FaMobileAlt } from 'react-icons/fa';
import api from '../../api/client';
import { formatCurrency, formatDate } from '../../utils/helpers';

const CashierDashboard = () => {
  const [stats, setStats] = useState({
    today_sales_count: 0,
    today_revenue: 0,
    recent_sales: [],
    today_mpesa_count: 0,
    today_cash_count: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dashboard/cashier/overview');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-800">My Daily Sales</h2>
        <p className="text-sm text-gray-500">Today&apos;s performance only — not total business revenue</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today&apos;s Sales</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {stats.today_sales_count}
              </p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <FaShoppingCart className="text-white text-xl" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today&apos;s Collections</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {formatCurrency(stats.today_revenue)}
              </p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <FaMoneyBillWave className="text-white text-xl" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Cash Today</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {stats.today_cash_count || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-500 rounded-lg">
              <FaReceipt className="text-white text-xl" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">M-Pesa Today</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {stats.today_mpesa_count || 0}
              </p>
            </div>
            <div className="p-3 bg-emerald-500 rounded-lg">
              <FaMobileAlt className="text-white text-xl" />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Today&apos;s Recent Sales</h2>
        {(stats.recent_sales || []).length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No sales yet today
          </div>
        ) : (
          <div className="space-y-2">
            {stats.recent_sales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm text-gray-800">
                    {sale.receipt_number}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(sale.sale_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary-600">
                    {formatCurrency(sale.total_amount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {sale.payment_method}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CashierDashboard;
