import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaSearch, FaPlus, FaMinus, FaTrash, FaCashRegister, 
  FaShoppingCart, FaTimes, FaBarcode, FaUser,
  FaCreditCard, FaMoneyBillWave, FaMobileAlt,
  FaPrint, FaReceipt
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import api from '../api/client';
import { payments, shifts } from '../api/endpoints';
import { formatCurrency } from '../utils/helpers';
import { mpesaSteps } from '../utils/mpesaInstructions';
import ProductCard from '../components/products/ProductCard';
import ShiftClock from '../components/shifts/ShiftClock';

const POSPage = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [mpesaReceipt, setMpesaReceipt] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [stkMessage, setStkMessage] = useState('');
  const [mpesaMode, setMpesaMode] = useState({
    account_type: 'paybill',
    send_money_phone: '',
    shortcode: '',
    account_number: '',
    configured: false,
    mpesa_enabled: true,
  });
  const [shift, setShift] = useState(undefined);
  const [shiftRefresh, setShiftRefresh] = useState(0);
  const { items, total, addItem, removeItem, updateQuantity, clearCart } = useCartStore();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user && user.role !== 'CASHIER') return undefined;
    fetchProducts();
    shifts.current()
      .then(({ data }) => setShift(data || null))
      .catch(() => setShift(null));
    payments.mpesaMode()
      .then(({ data }) => setMpesaMode(data || {}))
      .catch(() => {});
    return undefined;
  }, [user?.role]);

  useEffect(() => {
    setPaymentMethod((current) => {
      if (current !== 'MPESA' && current !== 'SEND_MONEY') return current;
      return mpesaMode.account_type === 'send_money' ? 'SEND_MONEY' : 'MPESA';
    });
  }, [mpesaMode.account_type]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/products/', { params: { limit: 100 } });
      setProducts(response.data.items || []);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.sku.toLowerCase().includes(search.toLowerCase())
  );

  const mobileMethod = mpesaMode.account_type === 'send_money' ? 'SEND_MONEY' : 'MPESA';
  const payingWithMpesa = paymentMethod === 'MPESA' || paymentMethod === 'SEND_MONEY';

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (payingWithMpesa && mpesaMode.stk_available && !customerPhone.trim()) {
      toast.error('Enter the customer M-Pesa phone number');
      return;
    }

    if (payingWithMpesa && !mpesaMode.stk_available && !mpesaMode.configured) {
      toast.error('Set a Paybill, Till, or Send Money number in Payment Settings');
      return;
    }

    setLoading(true);
    try {
      const cartItems = items.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      }));

      let response;
      if (payingWithMpesa && mpesaMode.stk_available) {
        const started = await payments.mpesaStkPush({
          items: cartItems,
          phone_number: customerPhone.trim(),
        });
        setStkMessage(started.data.customer_message || 'Waiting for KopoKopo...');
        let settled = null;
        for (let attempt = 0; attempt < 20; attempt += 1) {
          const status = await payments.mpesaStatus(started.data.payment_id);
          if (status.data.status === 'COMPLETED' && status.data.sale) {
            settled = status.data.sale;
            break;
          }
          if (status.data.status === 'FAILED') {
            throw new Error(status.data.result_desc || 'M-Pesa payment failed');
          }
          setStkMessage(status.data.result_desc || 'Waiting for KopoKopo to confirm...');
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        if (!settled) {
          throw new Error('KopoKopo has not confirmed this payment yet. Check the sale before charging again.');
        }
        response = { data: settled };
      } else {
        response = await api.post('/sales/', {
          items: cartItems,
          payment_method: payingWithMpesa ? mobileMethod : paymentMethod,
          mpesa_receipt_number: payingWithMpesa ? mpesaReceipt.trim() : undefined,
        });
      }
      setReceiptData(response.data);
      setShowReceipt(true);
      clearCart();
      setMpesaReceipt('');
      setCustomerPhone('');
      setStkMessage('');
      toast.success(payingWithMpesa ? 'M-Pesa payment confirmed' : 'Sale completed successfully!');
      fetchProducts();
      setShiftRefresh((n) => n + 1);
    } catch (error) {
      const message = error.response?.data?.detail || error.message || 'Sale failed';
      toast.error(typeof message === 'string' ? message : 'Sale failed');
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { value: 'CASH', icon: FaMoneyBillWave, label: 'Cash' },
    {
      value: mobileMethod,
      icon: FaMobileAlt,
      label: mpesaMode.account_type === 'till'
        ? 'Till'
        : mpesaMode.account_type === 'send_money'
          ? 'Send Money'
          : 'Paybill',
    },
    { value: 'CARD', icon: FaCreditCard, label: 'Card' },
  ];
  const mpesaGuide = mpesaSteps(mpesaMode, formatCurrency(total));

  if (user && user.role !== 'CASHIER') {
    return (
      <div className="bg-white rounded-xl border border-amber-100 p-8 text-center">
        <h1 className="text-xl font-bold text-gray-800">Cashiers only</h1>
        <p className="text-gray-500 mt-2">
          Owners manage products and settings. Only cashier accounts can make sales on the POS.
        </p>
      </div>
    );
  }

  if (shift === undefined) {
    return <div className="text-gray-400 py-12 text-center">Checking your shift...</div>;
  }

  if (!shift) {
    return (
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Start your shift</h1>
        <p className="text-sm text-gray-500 mb-4">Clock in with the cash in the drawer before you sell.</p>
        <ShiftClock onChange={setShift} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ShiftClock compact onChange={setShift} refreshToken={shiftRefresh} />
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaCashRegister className="text-primary-600" />
            Point of Sale
          </h1>
          <p className="text-gray-500 text-sm mt-1">Quick and easy checkout for your customers</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-100">
            <FaUser className="text-primary-600" />
            <span>{user?.name || 'Cashier'}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-100">
            <FaShoppingCart />
            <span>{items.length} items</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="relative mb-4">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-primary pl-10"
                placeholder="Search products by name or SKU..."
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-400">Loading products...</div>
              </div>
            ) : (
              <div className="pos-product-grid">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    compact
                    onAdd={(item) => {
                      addItem(item);
                      toast.success(`${item.name} added`);
                    }}
                  />
                ))}
              </div>
            )}

            {filteredProducts.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4 text-gray-300 flex justify-center"><FaSearch /></div>
                <p>No products found</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your search</p>
              </div>
            )}
          </div>
        </div>

        {/* Cart */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 pos-cart-panel sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Cart</h2>
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">
                          <FaBarcode />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(item.selling_price)} × {item.quantity}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 text-gray-500 hover:text-primary-600 rounded"
                      >
                        <FaMinus className="text-xs" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 text-gray-500 hover:text-primary-600 rounded"
                      >
                        <FaPlus className="text-xs" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded ml-1"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {items.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-6xl mb-4 text-gray-300 flex justify-center"><FaShoppingCart /></div>
                <p>Cart is empty</p>
                <p className="text-sm mt-1">Add products to start selling</p>
              </div>
            )}

            {items.length > 0 && (
              <>
                {/* Payment Method */}
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <label className="text-sm font-medium text-gray-700 block mb-2">Payment Method</label>
                  <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.value}
                          onClick={() => setPaymentMethod(method.value)}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                            paymentMethod === method.value
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <Icon className="text-sm" />
                          <span>{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {payingWithMpesa && mpesaMode.stk_available && (
                  <div className="mt-4 p-3 rounded-lg border border-green-100 bg-green-50 space-y-2">
                    <p className="text-sm font-medium text-gray-800">Send M-Pesa prompt</p>
                    <p className="text-sm text-gray-600">
                      {mpesaMode.sandbox
                        ? 'Sandbox mode does not send a PIN prompt to a real phone. The sale closes when KopoKopo simulates the payment.'
                        : 'The customer enters their M-Pesa PIN. The sale closes when the payment is confirmed.'}
                    </p>
                    <label className="text-sm font-medium text-gray-700 block">Customer phone</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="input-primary bg-white text-gray-800"
                      placeholder="07XXXXXXXX"
                      disabled={loading}
                      autoComplete="off"
                    />
                    {stkMessage && <p className="text-xs text-primary-700">{stkMessage}</p>}
                  </div>
                )}

                {payingWithMpesa && !mpesaMode.stk_available && (
                  <div className="mt-4 p-3 rounded-lg border border-green-100 bg-green-50 space-y-2">
                    <p className="text-sm font-medium text-gray-800">Customer pays, then you confirm</p>
                    <ol className="list-decimal pl-4 text-sm text-gray-700 space-y-1">
                      {mpesaGuide.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    <label className="text-sm font-medium text-gray-700 block">
                      M-Pesa code from the message (optional)
                    </label>
                    <input
                      type="text"
                      value={mpesaReceipt}
                      onChange={(e) => setMpesaReceipt(e.target.value.toUpperCase())}
                      className="input-primary bg-white text-gray-800"
                      placeholder="e.g. QAB12CD3EF"
                      disabled={loading}
                      autoComplete="off"
                    />
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary-600">{formatCurrency(total)}</span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="btn-primary w-full mt-4 py-3 text-lg flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <FaMobileAlt className="animate-pulse" />
                        Processing...
                      </span>
                    ) : (
                      <>
                        <FaReceipt />
                        {payingWithMpesa && mpesaMode.stk_available ? 'Send M-Pesa prompt' : payingWithMpesa ? 'Mark as paid' : 'Complete Sale'}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Receipt</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  <FaPrint />
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: receiptData.receipt_html }}
            />
            <button
              onClick={() => setShowReceipt(false)}
              className="btn-primary w-full mt-4"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default POSPage;