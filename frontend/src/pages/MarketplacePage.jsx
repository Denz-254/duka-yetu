import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaShoppingCart, FaStar, FaStore } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import useMarketCartStore from '../store/marketCartStore';
import { formatCurrency } from '../utils/helpers';

const MarketplacePage = () => {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const addItem = useMarketCartStore((state) => state.addItem);
  const cartCount = useMarketCartStore((state) => state.items.length);

  const load = async (search = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/marketplace/products', { params: { q: search || undefined } });
      setProducts(data.items || []);
    } catch (error) {
      toast.error('Failed to load marketplace products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#f1f1f2]">
      <header className="bg-[#f68b1e] text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/shop" className="flex items-center gap-2 font-bold text-xl">
            <FaStore /> DukaMall
          </Link>
          <form
            className="flex-1 flex"
            onSubmit={(e) => {
              e.preventDefault();
              load(q);
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-l-md px-4 py-2 text-gray-800"
              placeholder="Search products, brands and categories"
            />
            <button type="submit" className="bg-[#2e2e2e] px-4 rounded-r-md">
              <FaSearch />
            </button>
          </form>
          <Link to="/shop/checkout" className="flex items-center gap-2 font-medium">
            <FaShoppingCart /> Cart ({cartCount})
          </Link>
          <Link to="/" className="text-sm underline">Sell on Duka Yetu</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <h1 className="text-xl font-bold text-gray-800">Shop from verified Duka Yetu businesses</h1>
          <p className="text-sm text-gray-500 mt-1">
            Products listed here are uploaded by approved POS merchants. Pay with M-Pesa STK Push.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No products listed yet</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition">
                <Link to={`/shop/product/${product.id}`}>
                  <div className="aspect-square bg-gray-100">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
                        <FaStore />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-3">
                  <Link to={`/shop/product/${product.id}`} className="font-medium text-sm text-gray-800 line-clamp-2 hover:text-[#f68b1e]">
                    {product.name}
                  </Link>
                  <p className="text-xs text-gray-400 mt-1">{product.business_name}</p>
                  <div className="flex text-amber-400 text-xs mt-1">
                    {[0, 1, 2, 3, 4].map((i) => <FaStar key={i} className={i < 4 ? '' : 'text-gray-200'} />)}
                  </div>
                  <p className="text-lg font-bold text-gray-900 mt-2">{formatCurrency(product.selling_price)}</p>
                  <button
                    onClick={() => {
                      addItem(product);
                      toast.success('Added to cart');
                    }}
                    className="mt-2 w-full py-2 rounded-md bg-[#f68b1e] hover:bg-[#e07b12] text-white text-sm font-semibold"
                  >
                    ADD TO CART
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MarketplacePage;
