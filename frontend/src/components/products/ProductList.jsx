import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaSearch, FaEdit, FaTrash, FaPlus, FaImage, FaTimes } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import useProductStore from '../../store/productStore';
import useAuthStore from '../../store/authStore';
import ProductForm from './ProductForm';
import { formatCurrency } from '../../utils/helpers';

const ProductList = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [search, setSearch] = useState('');
  const { products, loading, fetchProducts, deleteProduct, searchProducts } = useProductStore();
  const user = useAuthStore((state) => state.user);
  const isOwner = user?.role === 'OWNER';

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (value.trim()) {
      searchProducts(value);
    } else {
      fetchProducts();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
        toast.success('Product deleted successfully');
      } catch (error) {
        toast.error('Failed to delete product');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            className="input-primary pl-10"
            placeholder="Search products..."
          />
        </div>
        {isOwner && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <FaPlus /> Add Product
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Image</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">SKU</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Price</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Stock</th>
                {isOwner && <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isOwner ? 6 : 5} className="text-center py-8 text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 6 : 5} className="text-center py-8 text-gray-400">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-gray-100 hover:bg-primary-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                          <FaImage />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">{product.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{product.sku}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium">
                      {formatCurrency(product.selling_price)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                        product.stock_quantity < 10
                          ? 'bg-red-100 text-red-600'
                          : product.stock_quantity < 20
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {product.stock_quantity}
                      </span>
                    </td>
                    {isOwner && (
                      <td className="py-3 px-4 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setShowForm(true);
                            }}
                            className="p-1 text-blue-500 hover:text-blue-600"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-1 text-red-500 hover:text-red-600"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
            <ProductForm
              product={editingProduct}
              onSuccess={() => {
                setShowForm(false);
                setEditingProduct(null);
                fetchProducts();
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingProduct(null);
              }}
            />
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ProductList;