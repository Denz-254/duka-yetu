import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaSearch, FaShoppingCart, FaStore, FaUser, FaHeart,
  FaTruck, FaUndo, FaLock, FaShieldAlt, FaHeadset,
  FaChevronRight, FaCreditCard, FaBoxOpen, FaCheckCircle,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import api from '../api/client';
import useMarketCartStore from '../store/marketCartStore';
import { formatCurrency } from '../utils/helpers';

const TRUST_BAR = [
  { icon: FaTruck, label: 'Free Shipping on Orders Over KES 2,000' },
  { icon: FaUndo, label: '30-Day Money-Back Guarantee' },
  { icon: FaHeadset, label: '24/7 Customer Support' },
];

const HERO_TRUST = [
  { icon: FaTruck, title: 'Free Shipping', sub: 'On selected orders' },
  { icon: FaUndo, title: '30 Days Returns', sub: 'Hassle-free returns' },
  { icon: FaLock, title: 'Secure Payment', sub: 'M-Pesa protected' },
];

const FOOTER_TRUST = [
  { icon: FaShieldAlt, title: 'Secure Checkout' },
  { icon: FaUndo, title: 'Easy Returns' },
  { icon: FaCheckCircle, title: 'Quality Guarantee' },
  { icon: FaTruck, title: 'Fast Delivery' },
];

const MarketplacePage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const addItem = useMarketCartStore((state) => state.addItem);
  const cartCount = useMarketCartStore((state) => state.items.length);

  const hero = featured[0] || null;

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = {
        q: q || undefined,
        category_id: categoryId || undefined,
      };
      const { data } = await api.get('/marketplace/products', { params });
      let items = data.items || [];
      if (sort === 'price_asc') items = [...items].sort((a, b) => a.selling_price - b.selling_price);
      if (sort === 'price_desc') items = [...items].sort((a, b) => b.selling_price - a.selling_price);
      if (sort === 'name') items = [...items].sort((a, b) => a.name.localeCompare(b.name));
      setProducts(items);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/marketplace/categories')
      .then(({ data }) => setCategories(data || []))
      .catch(() => setCategories([]));
    api.get('/marketplace/featured')
      .then(({ data }) => setFeatured(data || []))
      .catch(() => setFeatured([]));
  }, []);

  useEffect(() => {
    loadProducts();
  }, [categoryId, sort]);

  const handleAdd = (product) => {
    addItem(product);
    toast.success('Added to cart');
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 store-front">
      {/* Top trust bar */}
      <div className="bg-white border-b border-gray-100 text-xs text-gray-600">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-4 md:gap-8">
            {TRUST_BAR.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <Icon className="text-orange-500 text-[11px]" />
                <span className="hidden sm:inline">{label}</span>
              </span>
            ))}
          </div>
          <span className="text-gray-400">KES · Kenya</span>
        </div>
      </div>

      {/* Main nav */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/shop" className="flex items-center gap-2 shrink-0">
            <span className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center text-white">
              <FaStore />
            </span>
            <span className="text-xl font-bold tracking-tight">
              Duka<span className="text-orange-500">Mall</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-gray-700 ml-4">
            <Link to="/shop" className="text-orange-500">Home</Link>
            <button type="button" onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-orange-500">Shop</button>
            <button type="button" onClick={() => document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-orange-500">Categories</button>
            <Link to="/" className="hover:text-orange-500">Sell with us</Link>
          </nav>

          <form
            className="flex-1 max-w-md ml-auto flex"
            onSubmit={(e) => { e.preventDefault(); loadProducts(); }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-l-full border border-gray-200 border-r-0 px-4 py-2 text-sm focus:outline-none focus:border-orange-400"
              placeholder="Search products..."
            />
            <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 rounded-r-full">
              <FaSearch />
            </button>
          </form>

          <div className="flex items-center gap-3 text-gray-600">
            <Link to="/login" className="p-2 hover:text-orange-500" title="Account"><FaUser /></Link>
            <span className="p-2 text-gray-300" title="Wishlist"><FaHeart /></span>
            <Link to="/shop/checkout" className="relative p-2 hover:text-orange-500" title="Cart">
              <FaShoppingCart />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — featured product (admin-paid placement) */}
      <section className="bg-gradient-to-br from-gray-50 via-white to-orange-50/40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-10 md:py-16 grid md:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-orange-500 text-xs font-bold tracking-[0.2em] uppercase mb-3">
              {hero ? 'Featured Collection' : 'New Collection'}
            </p>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-gray-900 mb-4">
              {hero ? (
                <>Discover <span className="text-gray-900">{hero.name}</span></>
              ) : (
                <>Discover The Best Products <span className="text-gray-700">Online</span></>
              )}
            </h1>
            <p className="text-gray-500 text-base md:text-lg max-w-md mb-8">
              {hero?.description
                || 'Shop top-quality products at unbeatable prices. Exclusive deals just for you!'}
            </p>
            <div className="flex flex-wrap gap-3">
              {hero ? (
                <>
                  <Link
                    to={`/shop/product/${hero.id}`}
                    className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-md font-semibold text-sm transition"
                  >
                    Shop Now <FaChevronRight className="text-xs" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleAdd(hero)}
                    className="inline-flex items-center gap-2 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white px-6 py-3 rounded-md font-semibold text-sm transition"
                  >
                    Add to Cart
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-md font-semibold text-sm transition"
                >
                  Shop Now <FaChevronRight className="text-xs" />
                </button>
              )}
            </div>
            {hero && (
              <p className="mt-4 text-sm text-gray-400">
                Sold by {hero.business_name} · {formatCurrency(hero.selling_price)}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="relative flex justify-center"
          >
            <div className="relative w-full max-w-md aspect-square bg-gradient-to-b from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center overflow-hidden">
              {hero?.image_url ? (
                <img src={hero.image_url} alt={hero.name} className="w-full h-full object-contain p-6" />
              ) : (
                <FaStore className="text-7xl text-gray-300" />
              )}
              {(hero?.featured_badge || hero) && (
                <span className="absolute top-6 right-6 w-16 h-16 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center text-center leading-tight shadow-lg">
                  {hero?.featured_badge || 'New'}
                </span>
              )}
            </div>
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto px-4 pb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {HERO_TRUST.map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3 py-2">
              <span className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                <Icon />
              </span>
              <div>
                <p className="font-semibold text-sm text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories with product counts */}
      <section id="categories" className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Shop By Category</h2>
          <button
            type="button"
            onClick={() => setCategoryId('')}
            className="text-sm text-orange-500 font-medium hover:underline inline-flex items-center gap-1"
          >
            View All <FaChevronRight className="text-[10px]" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          <button
            type="button"
            onClick={() => setCategoryId('')}
            className={`rounded-xl border p-4 text-center transition hover:border-orange-400 hover:shadow-md ${
              !categoryId ? 'border-orange-500 bg-orange-50' : 'border-gray-100 bg-white'
            }`}
          >
            <span className="w-14 h-14 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-orange-500 mb-3">
              <FaBoxOpen className="text-xl" />
            </span>
            <p className="font-semibold text-sm">All</p>
            <p className="text-xs text-gray-400 mt-0.5">{products.length} items</p>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryId(cat.id)}
              className={`rounded-xl border p-4 text-center transition hover:border-orange-400 hover:shadow-md ${
                categoryId === cat.id ? 'border-orange-500 bg-orange-50' : 'border-gray-100 bg-white'
              }`}
            >
              <span
                className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: `${cat.color || '#f97316'}22`, color: cat.color || '#f97316' }}
              >
                <FaStore className="text-xl" />
              </span>
              <p className="font-semibold text-sm truncate">{cat.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{cat.product_count ?? 0} products</p>
            </button>
          ))}
        </div>
      </section>

      {/* Products grid */}
      <section id="products" className="bg-gray-50/80 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Best Selling Products</h2>
            <div className="flex items-center gap-3">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-gray-400">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-gray-100">
              No products match your filters
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden group hover:shadow-lg transition-shadow"
                >
                  <div className="relative aspect-square bg-gray-50">
                    <Link to={`/shop/product/${product.id}`}>
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <FaStore className="text-4xl" />
                        </div>
                      )}
                    </Link>
                    {product.is_featured && (
                      <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        Featured
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAdd(product)}
                      className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-white shadow flex items-center justify-center text-gray-700 opacity-0 group-hover:opacity-100 transition hover:bg-orange-500 hover:text-white"
                      title="Add to cart"
                    >
                      <FaShoppingCart className="text-sm" />
                    </button>
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">
                      {product.category_name || product.business_name}
                    </p>
                    <Link to={`/shop/product/${product.id}`}>
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 hover:text-orange-500">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-sm font-bold text-gray-900 mt-2">{formatCurrency(product.selling_price)}</p>
                    <button
                      type="button"
                      onClick={() => handleAdd(product)}
                      className="mt-3 w-full bg-gray-900 hover:bg-orange-500 text-white text-xs font-semibold py-2.5 rounded-md transition"
                    >
                      Add to Cart
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Promo banner */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">Limited Time Offer</p>
            <h3 className="text-xl md:text-2xl font-bold">Super Sale — Shop verified stores on DukaMall</h3>
            <p className="text-gray-400 text-sm mt-1">Secure M-Pesa checkout · Quality products from approved sellers</p>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
            className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-md text-sm"
          >
            Shop The Sale
          </button>
        </div>
      </section>

      {/* Why us stats */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { n: '10K+', l: 'Happy Customers' },
            { n: '15K+', l: 'Products Sold' },
            { n: '99%', l: 'Positive Reviews' },
            { n: '24/7', l: 'Customer Support' },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-2xl font-bold text-gray-900">{s.n}</p>
              <p className="text-sm text-gray-500 mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom trust */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {FOOTER_TRUST.map(({ icon: Icon, title }) => (
            <div key={title} className="flex items-center gap-3 justify-center py-2">
              <Icon className="text-orange-500" />
              <span className="text-sm font-medium text-gray-700">{title}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 text-white mb-3">
              <FaStore className="text-orange-500" />
              <span className="font-bold text-lg">Duka<span className="text-orange-500">Mall</span></span>
            </div>
            <p className="text-sm leading-relaxed">
              Multi-vendor marketplace powered by Duka Yetu. Pay safely with M-Pesa.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/shop" className="hover:text-white">Shop</Link></li>
              <li><Link to="/register" className="hover:text-white">Sell on DukaMall</Link></li>
              <li><Link to="/login" className="hover:text-white">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Customer Service</h4>
            <ul className="space-y-2 text-sm">
              <li className="inline-flex items-center gap-2"><FaHeadset className="text-orange-500" /> 24/7 Support</li>
              <li className="inline-flex items-center gap-2"><FaTruck className="text-orange-500" /> Shipping Policy</li>
              <li className="inline-flex items-center gap-2"><FaUndo className="text-orange-500" /> Returns</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Payments</h4>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="inline-flex items-center gap-1.5 bg-white/10 text-white text-xs px-2.5 py-1.5 rounded">
                <FaCreditCard /> M-Pesa
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/10 text-white text-xs px-2.5 py-1.5 rounded">
                Visa
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/10 text-white text-xs px-2.5 py-1.5 rounded">
                Mastercard
              </span>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 text-center text-xs py-4">
          © {new Date().getFullYear()} DukaMall · Duka Yetu. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default MarketplacePage;
