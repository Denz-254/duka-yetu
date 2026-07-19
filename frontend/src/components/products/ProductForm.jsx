import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { FaCloudUploadAlt, FaSpinner, FaTimes } from 'react-icons/fa';
import useProductStore from '../../store/productStore';
import useAuthStore from '../../store/authStore';
import { upload } from '../../api/endpoints';

const ProductForm = ({ product, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    selling_price: '',
    cost_price: '',
    stock_quantity: '',
    description: '',
    image_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef(null);
  const { createProduct, updateProduct } = useProductStore();
  const user = useAuthStore((state) => state.user);
  const isOwner = user?.role === 'OWNER';

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        selling_price: product.selling_price || '',
        cost_price: product.cost_price || '',
        stock_quantity: product.stock_quantity || '',
        description: product.description || '',
        image_url: product.image_url || '',
      });
      setImagePreview(product.image_url || '');
    }
  }, [product]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const response = await upload.image(file);

      setImagePreview(response.data.url);
      setFormData(prev => ({ ...prev, image_url: response.data.url }));
      toast.success('Image uploaded successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImagePreview('');
    setFormData(prev => ({ ...prev, image_url: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isOwner) {
      toast.error('Only owners can manage products');
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...formData,
        selling_price: parseFloat(formData.selling_price),
        cost_price: parseFloat(formData.cost_price) || null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
      };

      if (product) {
        await updateProduct(product.id, data);
        toast.success('Product updated successfully');
      } else {
        await createProduct(data);
        toast.success('Product created successfully');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white">
      <div>
        <label className="label-primary">Product Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="input-primary bg-white text-gray-800"
          placeholder="Enter product name"
          required
        />
      </div>

      <div>
        <label className="label-primary">SKU</label>
        <input
          type="text"
          name="sku"
          value={formData.sku}
          onChange={handleChange}
          className="input-primary bg-white text-gray-800"
          placeholder="Enter SKU"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-primary">Selling Price</label>
          <input
            type="number"
            name="selling_price"
            value={formData.selling_price}
            onChange={handleChange}
            className="input-primary bg-white text-gray-800"
            placeholder="0.00"
            step="0.01"
            required
          />
        </div>
        <div>
          <label className="label-primary">Cost Price</label>
          <input
            type="number"
            name="cost_price"
            value={formData.cost_price}
            onChange={handleChange}
            className="input-primary bg-white text-gray-800"
            placeholder="0.00"
            step="0.01"
          />
        </div>
      </div>

      <div>
        <label className="label-primary">Stock Quantity</label>
        <input
          type="number"
          name="stock_quantity"
          value={formData.stock_quantity}
          onChange={handleChange}
          className="input-primary bg-white text-gray-800"
          placeholder="0"
          required
        />
      </div>

      <div>
        <label className="label-primary">Product Image</label>
        <div className="mt-1 flex items-center gap-4">
          {imagePreview ? (
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-white">
              <img
                src={imagePreview}
                alt="Product"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl-lg hover:bg-red-600 transition-colors"
              >
                <FaTimes className="text-xs" />
              </button>
            </div>
          ) : (
            <div
              className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 bg-white flex items-center justify-center text-gray-400 hover:border-primary-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <FaCloudUploadAlt className="text-2xl" />
            </div>
          )}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-secondary flex items-center gap-2 text-sm bg-white"
            >
              {uploading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FaCloudUploadAlt />
                  {imagePreview ? 'Change Image' : 'Upload Image'}
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
          </div>
        </div>
      </div>

      <div>
        <label className="label-primary">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="input-primary bg-white text-gray-800"
          rows="3"
          placeholder="Product description"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || uploading}
          className="btn-primary flex-1 py-3"
        >
          {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary px-6 py-3 bg-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ProductForm;