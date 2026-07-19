import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaArrowLeft, FaShoppingCart, FaStar } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import useMarketCartStore from '../store/marketCartStore';
import { formatCurrency } from '../utils/helpers';

const MarketplaceProductPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const addItem = useMarketCartStore((state) => state.addItem);

  useEffect(() => {
    api.get(`/marketplace/products/${id}`)
      .then(({ data }) => setProduct(data))
      .catch(() => toast.error('Product not found'));
  }, [id]);

  if (!product) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f1f1f2]">
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/shop" className="flex items-center gap-2 text-gray-600 hover:text-[#f68b1e]">
            <FaArrowLeft /> Back to shop
          </Link>
          <Link to="/shop/checkout" className="flex items-center gap-2 text-[#f68b1e] font-medium">
            <FaShoppingCart /> Cart
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">No image</div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">{product.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Sold by {product.business_name}</p>
          <div className="flex text-amber-400 mt-2">
            {[0, 1, 2, 3, 4].map((i) => <FaStar key={i} className={i < 4 ? '' : 'text-gray-200'} />)}
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-4">{formatCurrency(product.selling_price)}</p>
          <p className="text-sm text-gray-500 mt-2">{product.stock_quantity} in stock</p>
          <p className="text-gray-600 mt-4">{product.description || 'Quality product from a Duka Yetu verified seller.'}</p>
          <button
            onClick={() => {
              addItem(product);
              toast.success('Added to cart');
            }}
            className="mt-6 w-full py-3 rounded-md bg-[#f68b1e] hover:bg-[#e07b12] text-white font-bold"
          >
            ADD TO CART
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceProductPage;
