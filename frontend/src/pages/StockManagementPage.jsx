import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaBarcode, FaSearch, FaPlus, FaMinus, FaEdit,
  FaTrash, FaExclamationTriangle, FaCheckCircle,
  FaClock, FaFilter, FaSort, FaDownload,
  FaBox, FaWarehouse, FaTruck, FaClipboardList, FaTimes
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import { formatCurrency } from '../utils/helpers';

const StockManagementPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockAdjustment, setStockAdjustment] = useState({
    quantity: 0,
    type: 'add',
    reason: '',
  });
  const [stockHistory, setStockHistory] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchStockHistory();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/products/', { params: { limit: 100 } });
      setProducts(response.data.items || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchStockHistory = async () => {
    try {
      // In production, this would call a stock history API
      setStockHistory([]);
    } catch (error) {
      console.error('Failed to fetch stock history:', error);
    }
  };

  const handleStockAdjustment = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    try {
      const newStock = stockAdjustment.type === 'add'
        ? selectedProduct.stock_quantity + stockAdjustment.quantity
        : selectedProduct.stock_quantity - stockAdjustment.quantity;
      
      await api.put(`/products/${selectedProduct.id}`, {
        stock_quantity: newStock,
      });
      
      toast.success(`Stock ${stockAdjustment.type === 'add' ? 'added' : 'removed'} successfully`);
      setShowModal(false);
      fetchProducts();
    } catch (error) {
      toast.error('Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'text-red-600 bg-red-50' };
    if (stock < 10) return { label: 'Critical', color: 'text-red-600 bg-red-50' };
    if (stock < 20) return { label: 'Low', color: 'text-yellow-600 bg-yellow-50' };
    if (stock < 50) return { label: 'Medium', color: 'text-blue-600 bg-blue-50' };
    return { label: 'High', color: 'text-green-600 bg-green-50' };
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockProducts = products.filter(p => p.stock_quantity < 20);
  const outOfStockProducts = products.filter(p => p.stock_quantity === 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaWarehouse className="text-primary-600" />
            Stock Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track and manage your inventory levels</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-2">
            <FaDownload /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-primary-600">{products.length}</p>
          <p className="text-sm text-gray-500">Total Products</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {products.filter(p => p.stock_quantity > 50).length}
          </p>
          <p className="text-sm text-gray-500">Well Stocked</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{lowStockProducts.length}</p>
          <p className="text-sm text-gray-500">Low Stock</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</p>
          <p className="text-sm text-gray-500">Out of Stock</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-primary pl-10"
            placeholder="Search products by name or SKU..."
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Product</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">SKU</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Stock</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Value</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-12 text-gray-400">No products found</td></tr>
              ) : (
                filteredProducts.map((product) => {
                  const status = getStockStatus(product.stock_quantity);
                  return (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-primary-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                              <FaBox className="text-gray-400" />
                            </div>
                          )}
                          <span className="font-medium text-gray-800">{product.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">{product.sku}</td>
                      <td className="py-3 px-4 text-right font-semibold">{product.stock_quantity}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(product.selling_price * product.stock_quantity)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setStockAdjustment({ quantity: 0, type: 'add', reason: '' });
                              setShowModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Adjust Stock"
                          >
                            <FaEdit />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Adjust Stock</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500">Product</p>
              <p className="font-semibold text-gray-800">{selectedProduct?.name}</p>
              <p className="text-sm text-gray-500">Current Stock: <span className="font-semibold">{selectedProduct?.stock_quantity}</span></p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleStockAdjustment(); }} className="space-y-4">
              <div>
                <label className="label-primary">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStockAdjustment({ ...stockAdjustment, type: 'add' })}
                    className={`py-2 rounded-lg font-medium transition-colors ${
                      stockAdjustment.type === 'add'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <FaPlus className="inline mr-1" /> Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockAdjustment({ ...stockAdjustment, type: 'remove' })}
                    className={`py-2 rounded-lg font-medium transition-colors ${
                      stockAdjustment.type === 'remove'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <FaMinus className="inline mr-1" /> Remove
                  </button>
                </div>
              </div>

              <div>
                <label className="label-primary">Quantity</label>
                <input
                  type="number"
                  value={stockAdjustment.quantity}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: parseInt(e.target.value) || 0 })}
                  className="input-primary bg-white text-gray-800"
                  placeholder="Enter quantity"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="label-primary">Reason</label>
                <input
                  type="text"
                  value={stockAdjustment.reason}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, reason: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                  placeholder="e.g., Stock received, damaged, returned"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 py-3">
                  Confirm Adjustment
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary px-6 py-3">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default StockManagementPage;