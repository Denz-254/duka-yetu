import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FaCrown, FaRocket, FaGem, FaCheckCircle, FaTimesCircle,
  FaClock, FaCreditCard, FaCalendarAlt, FaArrowRight,
  FaStar, FaStarHalf, FaRegStar, FaInfoCircle, FaLock,
  FaUnlock, FaToggleOn, FaToggleOff, FaStore, FaUsers,
  FaBoxes, FaChartLine, FaBuilding, FaUserFriends,
  FaFileInvoice, FaReceipt, FaShieldAlt, FaHeadset,
  FaDatabase, FaDownload, FaMobileAlt
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { subscription as subscriptionApi } from '../api/endpoints';

const SubscriptionPage = () => {
  const [currentPlan, setCurrentPlan] = useState('basic');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState('LOADING');
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(null);
  const [usageStats, setUsageStats] = useState({
    users: 0, max_users: 3, branches: 0, max_branches: 1,
  });

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      icon: FaRocket,
      price: { monthly: 2500, yearly: 25000 },
      description: 'Perfect for small businesses just starting out',
      features: [
        { name: 'Single Branch', included: true },
        { name: 'Up to 3 Staff Accounts', included: true },
        { name: 'Unlimited Products', included: true },
        { name: 'Basic Reports', included: true },
        { name: '24/7 Email Support', included: true },
        { name: 'Multi-Branch Support', included: false },
        { name: 'Advanced Analytics', included: false },
        { name: 'Priority Support', included: false },
        { name: 'Custom Integrations', included: false },
        { name: 'Dedicated Account Manager', included: false },
        { name: 'API Access', included: false },
      ],
      popular: false,
      current: false,
      buttonText: 'Start Free Trial',
    },
    {
      id: 'professional',
      name: 'Professional',
      icon: FaCrown,
      price: { monthly: 5000, yearly: 50000 },
      description: 'For growing businesses with multiple locations',
      features: [
        { name: 'Multiple Branches', included: true },
        { name: 'Up to 15 Staff Accounts', included: true },
        { name: 'Unlimited Products', included: true },
        { name: 'Advanced Reports', included: true },
        { name: 'Priority Support', included: true },
        { name: 'Multi-Branch Support', included: true },
        { name: 'Advanced Analytics', included: true },
        { name: 'Custom Integrations', included: false },
        { name: 'Dedicated Account Manager', included: false },
        { name: 'API Access', included: false },
        { name: 'White Label', included: false },
      ],
      popular: true,
      current: true,
      buttonText: 'Current Plan',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      icon: FaGem,
      price: { monthly: 10000, yearly: 100000 },
      description: 'For large businesses with complex needs',
      features: [
        { name: 'Unlimited Branches', included: true },
        { name: 'Unlimited Staff Accounts', included: true },
        { name: 'Unlimited Products', included: true },
        { name: 'Custom Reports', included: true },
        { name: 'Dedicated Account Manager', included: true },
        { name: 'Multi-Branch Support', included: true },
        { name: 'Advanced Analytics', included: true },
        { name: 'Custom Integrations', included: true },
        { name: 'API Access', included: true },
        { name: 'White Label', included: true },
        { name: 'Data Export', included: true },
      ],
      popular: false,
      current: false,
      buttonText: 'Start Free Trial',
    },
  ];

  const billingHistory = [];

  useEffect(() => {
    subscriptionApi.get()
      .then(({ data }) => {
        setCurrentPlan(data.plan.toLowerCase());
        setSubscriptionStatus(data.status);
        setCurrentPeriodEnd(data.current_period_end || data.trial_ends_at);
        setUsageStats({
          users: data.usage.staff,
          max_users: data.limits.staff ?? 'Unlimited',
          branches: data.usage.branches || 0,
          max_branches: data.limits.branches ?? 'Unlimited',
        });
      })
      .catch((error) => toast.error(error.response?.data?.detail || 'Failed to load subscription'));
  }, []);

  const handleUpgrade = async (planId) => {
    setLoading(true);
    try {
      const { data } = await subscriptionApi.checkout(planId, billingCycle);
      window.location.assign(data.checkout_url);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Unable to start checkout');
      setLoading(false);
    }
  };

  const openBillingPortal = async () => {
    setLoading(true);
    try {
      const { data } = await subscriptionApi.portal();
      window.location.assign(data.portal_url);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Unable to open billing portal');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaCrown className="text-primary-600" />
          Subscription & Billing
        </h1>
        <p className="text-gray-500 text-sm mt-1">Manage your plan, billing, and subscription details</p>
      </div>

      {/* Current Plan Summary */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="text-primary-100 text-sm">Current Plan</p>
            <h2 className="text-3xl font-bold">{plans.find(p => p.id === currentPlan)?.name}</h2>
            <p className="text-primary-100 mt-1">
              {plans.find(p => p.id === currentPlan)?.description}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
              <p className="text-sm text-primary-100">Billing Cycle</p>
              <p className="font-semibold">{billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}</p>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
              <p className="text-sm text-primary-100">Next Billing</p>
              <p className="font-semibold">{currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString('en-KE') : 'Not scheduled'}</p>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
              <p className="text-sm text-primary-100">Status</p>
              <p className="font-semibold flex items-center gap-1">
                <FaCheckCircle className="text-green-300" /> {subscriptionStatus}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-sm text-gray-500">Users</p>
          <p className="text-2xl font-bold text-gray-800">{usageStats.users} / {usageStats.max_users}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-sm text-gray-500">Branches</p>
          <p className="text-2xl font-bold text-gray-800">{usageStats.branches} / {usageStats.max_branches}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-sm text-gray-500">Products</p>
          <p className="text-2xl font-bold text-gray-800">Unlimited</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-sm text-gray-500">Storage</p>
          <p className="text-2xl font-bold text-gray-800">Cloud</p>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = plan.id === currentPlan && subscriptionStatus === 'ACTIVE';
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-300 ${
                plan.popular ? 'border-primary-500 shadow-lg' : 'border-gray-100'
              } ${isCurrent ? 'ring-2 ring-primary-500' : ''}`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-primary-600 text-white text-xs font-medium px-4 py-1 rounded-bl-lg">
                    Most Popular
                  </div>
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-0 left-0">
                  <div className="bg-green-600 text-white text-xs font-medium px-4 py-1 rounded-br-lg">
                    Current
                  </div>
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${plan.popular ? 'bg-primary-50' : 'bg-gray-50'}`}>
                    <Icon className={`text-xl ${plan.popular ? 'text-primary-600' : 'text-gray-600'}`} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">{plan.name}</h3>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-800">
                    KSh {billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly}
                  </span>
                  <span className="text-gray-500 text-sm">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>

                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

                <div className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {feature.included ? (
                        <FaCheckCircle className="text-green-500 text-xs flex-shrink-0" />
                      ) : (
                        <FaTimesCircle className="text-gray-300 text-xs flex-shrink-0" />
                      )}
                      <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => !isCurrent && handleUpgrade(plan.id)}
                  disabled={isCurrent || loading}
                  className={`w-full py-3 rounded-lg font-medium transition-all duration-200 ${
                    isCurrent
                      ? 'bg-green-50 text-green-600 cursor-default'
                      : plan.popular
                      ? 'btn-primary'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : loading ? 'Processing...' : plan.buttonText}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-4 py-2">
        <span className={`text-sm ${billingCycle === 'monthly' ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
          Monthly
        </span>
        <button
          onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
          className="relative w-12 h-6 bg-gray-200 rounded-full transition-colors duration-300"
        >
          <div
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
              billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
        <span className={`text-sm ${billingCycle === 'yearly' ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
          Yearly
          <span className="ml-1 text-xs text-green-600">(Save 20%)</span>
        </span>
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Billing History</h3>
          <button className="text-primary-600 text-sm hover:text-primary-700">View All →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Description</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {billingHistory.length === 0 && (
                <tr><td colSpan="5" className="py-8 text-center text-sm text-gray-500">Invoices are available in the secure billing portal.</td></tr>
              )}
              {billingHistory.map((bill) => (
                <tr key={bill.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-sm text-gray-600">{bill.date}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{bill.description}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-800 text-right">
                    KSh {bill.amount}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-600">
                      {bill.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-primary-600 hover:text-primary-700 text-sm">Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={openBillingPortal}
          className="btn-primary flex items-center gap-2"
        >
          <FaCreditCard /> Update Payment Method
        </button>
        <button
          onClick={openBillingPortal}
          className="btn-secondary flex items-center gap-2"
        >
          <FaFileInvoice /> Request Invoice
        </button>
        <button
          onClick={openBillingPortal}
          className="btn-danger flex items-center gap-2"
        >
          <FaTimesCircle /> Cancel Subscription
        </button>
      </div>
    </div>
  );
};

export default SubscriptionPage;