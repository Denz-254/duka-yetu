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
import { payments } from '../api/endpoints';
import { formatCurrency } from '../utils/helpers';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const POSPage = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaStatus, setMpesaStatus] = useState('');
  const { items, total, addItem, removeItem, updateQuantity, clearCart } = useCartStore();
  const user = useAuthStore((state) => state.user);

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

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/products/');
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

  const waitForMpesaPayment = async (paymentId) => {
    // Poll until Safaricom callback completes the sale (or fails / times out).
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const { data } = await payments.mpesaStatus(paymentId);
      setMpesaStatus(data.status);
      if (data.status === 'COMPLETED' && data.sale) {
        return data.sale;
      }
      if (data.status === 'FAILED') {
        throw new Error(data.result_desc || 'M-Pesa payment failed or was cancelled');
      }
      setMpesaStatus('Waiting for customer to enter M-Pesa PIN...');
      await sleep(3000);
    }
    throw new Error('Timed out waiting for M-Pesa confirmation. Ask the customer to retry.');
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (paymentMethod === 'MPESA') {
      if (!mpesaPhone.trim()) {
        toast.error('Enter the customer M-Pesa phone number');
        return;
      }
    }

    setLoading(true);
    setMpesaStatus('');
    try {
      const cartItems = items.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      }));

      if (paymentMethod === 'MPESA') {
        setMpesaStatus('Sending STK Push...');
        const { data: push } = await payments.mpesaStkPush({
          items: cartItems,
          phone_number: mpesaPhone.trim(),
        });
        toast.success(push.customer_message || 'STK Push sent. Enter PIN on phone.');
        setMpesaStatus(push.customer_message || 'Check your phone...');
        const sale = await waitForMpesaPayment(push.payment_id);
        setReceiptData(sale);
        setShowReceipt(true);
        clearCart();
        setMpesaPhone('');
        setMpesaStatus('');
        toast.success('M-Pesa payment successful!');
        fetchProducts();
        return;
      }

      const response = await api.post('/sales/', {
        items: cartItems,
        payment_method: paymentMethod,
      });
      setReceiptData(response.data);
      setShowReceipt(true);
      clearCart();
      toast.success('Sale completed successfully!');
      fetchProducts();
    } catch (error) {
      const message = error.response?.data?.detail || error.message || 'Sale failed';
      toast.error(typeof message === 'string' ? message : 'Sale failed');
      setMpesaStatus('');
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { value: 'CASH', icon: FaMoneyBillWave, label: 'Cash' },
    { value: 'MPESA', icon: FaMobileAlt, label: 'M-Pesa' },
    { value: 'CARD', icon: FaCreditCard, label: 'Card' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaCashRegister className="text-primary-600" />
            Point of Sale
          </h1>
          <p className="text-gray-500 text-sm mt-1">Quick and easy checkout for your customers</p>
        </div>
        <div className="flex items-center gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[550px] overflow-y-auto p-1">
                {filteredProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    whileHover={{ y: -2 }}
                    className={`max-w-full overflow-hidden bg-white rounded-lg shadow-lg border border-gray-100 ${
                      product.stock_quantity <= 0 ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="px-4 py-3">
                      <h3 className="text-lg font-bold text-gray-800 uppercase line-clamp-1">{product.name}</h3>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                        {product.description || product.sku}
                      </p>
                    </div>
                    {product.image_url ? (
                      <img
                        className="object-cover w-full h-40"
                        src={product.image_url}
                        alt={product.name}
                      />
                    ) : (
                      <div className="w-full h-40 bg-primary-50 flex items-center justify-center text-primary-300">
                        <FaBarcode className="text-4xl" />
                      </div>
                    )}
                    <div className="flex items-center justify-between px-4 py-3 bg-primary-900">
                      <h4 className="text-base font-bold text-white">{formatCurrency(product.selling_price)}</h4>
                      <button
                        type="button"
                        disabled={product.stock_quantity <= 0}
                        onClick={() => {
                          addItem(product);
                          toast.success(`${product.name} added to cart`);
                        }}
                        className="px-2 py-1 text-xs font-semibold text-primary-900 uppercase transition-colors duration-300 transform bg-white rounded hover:bg-primary-50 disabled:bg-gray-300 disabled:text-gray-500 focus:outline-none"
                      >
                        {product.stock_quantity > 0 ? 'Add to cart' : 'Out of stock'}
                      </button>
                    </div>
                  </motion.div>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sticky top-4">
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
                  <div className="grid grid-cols-3 gap-2">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.value}
                          onClick={() => {
                            setPaymentMethod(method.value);
                            setMpesaStatus('');
                          }}
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

                {paymentMethod === 'MPESA' && (
                  <div className="mt-4 p-3 rounded-lg border border-green-100 bg-green-50 space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">
                      Customer M-Pesa Number
                    </label>
                    <input
                      type="tel"
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                      className="input-primary bg-white text-gray-800"
                      placeholder="07XXXXXXXX or 2547XXXXXXXX"
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500">
                      An STK Push prompt will be sent to this phone to enter the M-Pesa PIN.
                    </p>
                    {mpesaStatus && (
                      <p className="text-xs font-medium text-green-700">{mpesaStatus}</p>
                    )}
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
                        {paymentMethod === 'MPESA' ? 'Waiting for M-Pesa...' : 'Processing...'}
                      </span>
                    ) : (
                      <>
                        <FaReceipt />
                        {paymentMethod === 'MPESA' ? 'Pay with M-Pesa' : 'Complete Sale'}
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