import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaSearch, FaShoppingCart, FaStore, FaUser, FaHeart,
  FaTruck, FaUndo, FaShieldAlt, FaHeadset, FaChevronLeft,
  FaChevronRight, FaLock, FaStar, FaMobileAlt, FaBars, FaTimes,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../api/client';
import useMarketCartStore from '../store/marketCartStore';
import { formatCurrency } from '../utils/helpers';
import Seo from '../components/common/Seo';
import useAuthStore from '../store/authStore';

const CAT_ICONS = [FaStore, FaHeart, FaMobileAlt, FaTruck, FaStar, FaShieldAlt];

const DEFAULT_HERO = {
  id: null,
  name: 'DukaMall online store',
  description: 'Find quality products from verified Kenyan sellers. Pay securely with M-Pesa.',
  image_url: null,
  business_name: 'Duka Yetu',
  featured_badge: 'New Collection',
  selling_price: null,
};

function useHorizontalScroll() {
  const ref = useRef(null);
  const scrollBy = (dir) => {
    if (!ref.current) return;
    const amount = Math.min(ref.current.clientWidth * 0.8, 320);
    ref.current.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };
  return { ref, scrollBy };
}

const ProductCard = ({ product, onAdd }) => (
  <article className="w-[200px] sm:w-[220px] md:w-[240px] shrink-0 max-w-xs overflow-hidden bg-white rounded-lg shadow-lg">
    <div className="px-4 py-2">
      <Link to={`/shop/product/${product.id}`}>
        <h1 className="text-base sm:text-lg font-bold text-gray-800 uppercase line-clamp-1 hover:text-primary-700">
          {product.name}
        </h1>
      </Link>
      <p className="mt-1 text-xs sm:text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]">
        {product.description || product.category_name || `Sold by ${product.business_name}`}
      </p>
    </div>

    <Link to={`/shop/product/${product.id}`}>
      {product.image_url ? (
        <img
          className="object-cover w-full h-48 mt-2"
          src={product.image_url}
          alt={product.name}
        />
      ) : (
        <div className="w-full h-48 mt-2 bg-primary-50 flex items-center justify-center text-primary-300">
          <FaStore className="text-4xl" />
        </div>
      )}
    </Link>

    <div className="flex items-center justify-between px-4 py-2 bg-gray-900">
      <h1 className="text-sm sm:text-lg font-bold text-white">{formatCurrency(product.selling_price)}</h1>
      <button
        type="button"
        onClick={() => onAdd(product)}
        className="px-2 py-1 text-xs font-semibold text-gray-900 uppercase transition-colors duration-300 transform bg-white rounded hover:bg-gray-200 focus:bg-gray-400 focus:outline-none"
      >
        Add to cart
      </button>
    </div>
  </article>
);

const ScrollRail = ({ title, products, onAdd, onViewAll }) => {
  const { ref, scrollBy } = useHorizontalScroll();
  if (!products?.length) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-primary-500 hover:text-primary-600"
            aria-label="Scroll left"
          >
            <FaChevronLeft className="text-xs" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-primary-500 hover:text-primary-600"
            aria-label="Scroll right"
          >
            <FaChevronRight className="text-xs" />
          </button>
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="hidden sm:inline text-sm font-medium text-primary-600 hover:underline ml-1"
            >
              View All
            </button>
          )}
        </div>
      </div>
      <div ref={ref} className="scroll-rail">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
};

const MarketplacePage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const addItem = useMarketCartStore((state) => state.addItem);
  const cartCount = useMarketCartStore((state) => state.items.length);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const catScroll = useHorizontalScroll();

  const heroSlides = useMemo(() => {
    if (featured.length) return featured;
    return [DEFAULT_HERO];
  }, [featured]);

  const activeSlide = heroSlides[heroIndex % heroSlides.length] || DEFAULT_HERO;

  const loadProducts = useCallback(async (opts = {}) => {
    setLoading(true);
    try {
      const params = {
        q: opts.q !== undefined ? opts.q || undefined : q || undefined,
        category_id: opts.categoryId !== undefined ? opts.categoryId || undefined : categoryId || undefined,
        limit: 48,
      };
      const { data } = await api.get('/marketplace/products', { params });
      setProducts(data.items || []);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [q, categoryId]);

  useEffect(() => {
    api.get('/marketplace/categories')
      .then(({ data }) => setCategories(data || []))
      .catch(() => setCategories([]));
    api.get('/marketplace/featured', { params: { limit: 12 } })
      .then(({ data }) => setFeatured(data || []))
      .catch(() => setFeatured([]));
  }, []);

  useEffect(() => {
    loadProducts();
  }, [categoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-advance hero
  useEffect(() => {
    if (heroSlides.length < 2) return undefined;
    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroSlides.length);
    }, 5500);
    return () => clearInterval(t);
  }, [heroSlides.length]);

  const handleAdd = (product) => {
    if (!product?.id) return;
    addItem(product);
    toast.success('Added to cart');
  };

  const deals = products.slice(0, 12);
  const recommended = products.length > 8
    ? [...products].sort((a, b) => a.selling_price - b.selling_price).slice(0, 12)
    : products;
  const newest = products.slice(0, 8);
  const promoImages = [
    featured[0]?.image_url || products[0]?.image_url,
    products[1]?.image_url || products[0]?.image_url,
    products[2]?.image_url || products[0]?.image_url,
  ];

  const selectCategory = (id) => {
    setCategoryId(id);
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="store-front min-h-screen bg-white text-gray-900">
      <Seo
        title="DukaMall Online Shop | Duka Yetu"
        description="Shop quality products from verified Kenyan sellers. Pay securely with M-Pesa on DukaMall."
        path="/shop"
      />
      {/* Top utility bar */}
      <div className="bg-primary-800 text-primary-100 text-xs">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5">
            <FaHeadset className="text-primary-300" /> Need Help? 24/7 Support Center
          </span>
          <span className="inline-flex items-center gap-3">
            <span className="hidden sm:inline">Special Offer · Season Sale up to 50% Off</span>
            <Link to="/register" className="font-semibold text-white hover:underline">Sell on DukaMall</Link>
          </span>
        </div>
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            className="lg:hidden p-2 text-gray-600"
            onClick={() => setMobileNav(true)}
            aria-label="Menu"
          >
            <FaBars />
          </button>

          <Link to="/shop" className="flex items-center gap-2 shrink-0">
            <span className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-sm">
              <FaStore />
            </span>
            <span className="text-xl font-bold tracking-tight">
              Duka<span className="text-primary-600">Mall</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-gray-600 ml-6">
            <Link to="/shop" className="text-primary-600">Home</Link>
            <button type="button" onClick={() => document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary-600">Categories</button>
            <button type="button" onClick={() => document.getElementById('deals')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary-600">Deals</button>
            <button type="button" onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary-600">Best Sellers</button>
            <Link to="/" className="hover:text-primary-600">Collections</Link>
          </nav>

          <form
            className="hidden md:flex flex-1 max-w-md ml-auto"
            onSubmit={(e) => {
              e.preventDefault();
              loadProducts({ q });
              document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <div className="flex w-full rounded-full border border-gray-200 overflow-hidden focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full px-4 py-2 text-sm outline-none bg-white"
                placeholder="Search fashion, tech, beauty..."
              />
              <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-4">
                <FaSearch />
              </button>
            </div>
          </form>

          <div className="flex items-center gap-1 sm:gap-2 text-gray-600 ml-auto md:ml-2">
            <button
              type="button"
              className="md:hidden p-2 hover:text-primary-600"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search"
            >
              <FaSearch />
            </button>
            <Link to={isAuthenticated ? '/shop/checkout' : '/shop/register'} className="p-2 hover:text-primary-600" title="Account"><FaUser /></Link>
            <span className="p-2 text-gray-300" title="Wishlist"><FaHeart /></span>
            <Link to="/shop/checkout" className="relative p-2 hover:text-primary-600" title="Cart">
              <FaShoppingCart />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-primary-600 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
        {searchOpen && (
          <form
            className="md:hidden px-4 pb-3"
            onSubmit={(e) => {
              e.preventDefault();
              loadProducts({ q });
              setSearchOpen(false);
              document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <div className="flex rounded-full border border-gray-200 overflow-hidden">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full px-4 py-2 text-sm outline-none"
                placeholder="Search products..."
                autoFocus
              />
              <button type="submit" className="bg-primary-600 text-white px-4"><FaSearch /></button>
            </div>
          </form>
        )}
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileNav && (
          <motion.div className="fixed inset-0 z-[60] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNav(false)} />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-white p-5 shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-lg">Duka<span className="text-primary-600">Mall</span></span>
                <button type="button" onClick={() => setMobileNav(false)}><FaTimes /></button>
              </div>
              <nav className="flex flex-col gap-3 text-sm font-medium text-gray-700">
                <Link to="/shop" onClick={() => setMobileNav(false)}>Home</Link>
                <button type="button" className="text-left" onClick={() => { setMobileNav(false); document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' }); }}>Categories</button>
                <button type="button" className="text-left" onClick={() => { setMobileNav(false); document.getElementById('deals')?.scrollIntoView({ behavior: 'smooth' }); }}>Deals</button>
                <Link to="/shop/checkout" onClick={() => setMobileNav(false)}>Cart ({cartCount})</Link>
                <Link to="/login" onClick={() => setMobileNav(false)}>Account</Link>
                <Link to="/register" onClick={() => setMobileNav(false)}>Sell with us</Link>
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero slider — paid featured products */}
      <section className="relative bg-gray-900 overflow-hidden">
        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide.id || activeSlide.name || heroIndex}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
            >
              {activeSlide.image_url ? (
                <img
                  src={activeSlide.image_url}
                  alt={activeSlide.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/20" />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24 min-h-[420px] md:min-h-[520px] flex items-center">
          <div className="max-w-xl text-white">
            <p className="text-primary-300 text-xs font-bold tracking-[0.2em] uppercase mb-3">
              {activeSlide.featured_badge || (activeSlide.id ? 'Featured' : 'New Collection')}
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4">
              {activeSlide.name || 'Find Your Style, Love Your Look'}
            </h1>
            <p className="text-white/80 text-base md:text-lg mb-6 line-clamp-3">
              {activeSlide.description
                || `Shop top picks from ${activeSlide.business_name || 'verified sellers'}.`}
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              {activeSlide.id ? (
                <>
                  <Link
                    to={`/shop/product/${activeSlide.id}`}
                    className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-full font-semibold text-sm transition"
                  >
                    Shop Now <FaChevronRight className="text-xs" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleAdd(activeSlide)}
                    className="inline-flex items-center gap-2 border border-white/40 hover:bg-white/10 text-white px-6 py-3 rounded-full font-semibold text-sm transition"
                  >
                    Add to Cart
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-full font-semibold text-sm"
                >
                  Shop Now <FaChevronRight className="text-xs" />
                </button>
              )}
            </div>
            {activeSlide.business_name && (
              <p className="mt-5 text-sm text-white/60">
                Featured by <span className="text-white font-medium">{activeSlide.business_name}</span>
                {activeSlide.selling_price != null && (
                  <> · {formatCurrency(activeSlide.selling_price)}</>
                )}
              </p>
            )}
          </div>
        </div>

        {heroSlides.length > 1 && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
            {heroSlides.map((s, i) => (
              <button
                key={s.id || i}
                type="button"
                onClick={() => setHeroIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === heroIndex % heroSlides.length ? 'w-8 bg-primary-400' : 'w-1.5 bg-white/40'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        )}
        {heroSlides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setHeroIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length)}
              className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur z-10"
              aria-label="Previous"
            >
              <FaChevronLeft />
            </button>
            <button
              type="button"
              onClick={() => setHeroIndex((i) => (i + 1) % heroSlides.length)}
              className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur z-10"
              aria-label="Next"
            >
              <FaChevronRight />
            </button>
          </>
        )}
      </section>

      {/* Category chips — horizontal scroll */}
      <section id="categories" className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div ref={catScroll.ref} className="scroll-rail gap-2">
            <button
              type="button"
              onClick={() => selectCategory('')}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition ${
                !categoryId
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400'
              }`}
            >
              All
            </button>
            {categories.map((cat, idx) => {
              const Icon = CAT_ICONS[idx % CAT_ICONS.length];
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => selectCategory(cat.id)}
                  className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition ${
                    categoryId === cat.id
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400'
                  }`}
                >
                  <Icon className="text-xs opacity-80" />
                  {cat.name}
                  <span className="opacity-70 text-xs">({cat.product_count ?? 0})</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Promo tiles */}
      <section id="deals" className="max-w-7xl mx-auto px-4 py-8 grid sm:grid-cols-3 gap-4">
        {[
          {
            title: 'Flash Sale',
            sub: 'Limited time deals on DukaMall',
            cta: 'Shop deals',
            bg: 'from-primary-700 to-primary-500',
            img: promoImages[0],
          },
          {
            title: 'Free Shipping',
            sub: 'On orders over KES 2,000',
            cta: 'Shop now',
            bg: 'from-emerald-800 to-teal-600',
            img: promoImages[1],
          },
          {
            title: 'New Arrivals',
            sub: 'Latest from verified sellers',
            cta: 'Explore',
            bg: 'from-gray-800 to-gray-600',
            img: promoImages[2],
          },
        ].map((tile) => (
          <button
            key={tile.title}
            type="button"
            onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
            className={`relative overflow-hidden rounded-2xl min-h-[140px] text-left p-5 text-white bg-gradient-to-br ${tile.bg}`}
          >
            {tile.img && (
              <img src={tile.img} alt="" className="absolute right-0 bottom-0 w-28 h-28 object-cover opacity-40 rounded-tl-3xl" />
            )}
            <p className="relative text-lg font-bold">{tile.title}</p>
            <p className="relative text-sm text-white/80 mt-1 mb-3">{tile.sub}</p>
            <span className="relative text-xs font-semibold underline underline-offset-2">{tile.cta}</span>
          </button>
        ))}
      </section>

      {loading && !products.length ? (
        <div className="text-center py-20 text-gray-400">Loading products...</div>
      ) : (
        <>
          <div id="catalog">
            <ScrollRail
              title="Best Deals for You"
              products={deals}
              onAdd={handleAdd}
              onViewAll={() => selectCategory('')}
            />
          </div>
          <div className="bg-primary-50/40">
            <ScrollRail
              title="Recommended for You"
              products={recommended}
              onAdd={handleAdd}
            />
          </div>
          <ScrollRail
            title="New Arrivals"
            products={newest}
            onAdd={handleAdd}
          />
        </>
      )}

      {!loading && products.length === 0 && (
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-400">
          No products match your filters
        </div>
      )}

      {/* Trust row */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: FaLock, title: 'Secure Payment', sub: 'M-Pesa & checkout safety' },
            { icon: FaUndo, title: 'Easy Returns', sub: '30-day return policy' },
            { icon: FaHeadset, title: '24/7 Support', sub: 'Dedicated help center' },
            { icon: FaStar, title: 'Trusted Sellers', sub: 'Approved businesses only' },
          ].map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                <Icon />
              </span>
              <div>
                <p className="font-semibold text-sm text-gray-900">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Club / CTA */}
      <section className="bg-gradient-to-r from-primary-800 to-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold">Join DukaMall Club</h2>
            <p className="text-primary-100 mt-1 text-sm">Exclusive offers, early access, and seller updates.</p>
          </div>
          <Link
            to="/register"
            className="shrink-0 bg-white text-primary-700 font-semibold px-6 py-3 rounded-full text-sm hover:bg-primary-50 transition"
          >
            Join Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 text-white mb-3">
              <FaStore className="text-primary-400" />
              <span className="font-bold text-lg">Duka<span className="text-primary-400">Mall</span></span>
            </div>
            <p className="text-sm leading-relaxed">
              Multi-vendor marketplace powered by Duka Yetu. Secure M-Pesa payments from verified shops.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/shop" className="hover:text-white">All products</Link></li>
              <li><Link to="/shop/checkout" className="hover:text-white">Cart</Link></li>
              <li><Link to="/login" className="hover:text-white">My account</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Sell</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/register" className="hover:text-white">Open a shop</Link></li>
              <li><Link to="/" className="hover:text-white">About Duka Yetu</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Payments</h4>
            <div className="flex flex-wrap items-center gap-3">
              {/* M-Pesa badge */}
              <span className="inline-flex items-center h-9 px-2.5 rounded bg-[#4caf50] text-white text-[11px] font-bold tracking-wide shadow-sm" title="M-Pesa">
                <FaMobileAlt className="mr-1.5" /> M-PESA
              </span>
              {/* Visa */}
              <span className="inline-flex items-center justify-center h-9 px-3 rounded bg-white shadow-sm" title="Visa">
                <svg viewBox="0 0 48 16" className="h-4 w-12" aria-hidden>
                  <path fill="#1A1F71" d="M19.5 1.2h-3.4l-2.1 13.6h3.4L19.5 1.2zM13.2 1.2L10 11.5l-.4-1.9L8.2 3.1C8 2 7.3 1.2 6.2 1.2H.7L.6 1.5c1.1.2 2.3.6 3 1 .5.3.6.5.8 1.1l2.9 11.2h3.6l5.5-13.6h-3.2zM35.3 1.2l-3.3 13.6h3.2l3.3-13.6h-3.2zM44.4 1.2c-.8 0-1.4.2-1.8.5-.4.3-.6.7-.7 1.3l-2.6 11.8h3.4l.4-1.7h4.1l.2 1.7h3L48 1.2h-3.6zm.3 3.3l1 4.7h-2.7l1.7-4.7zM29 1.2c-1.1 0-2 .3-2.5.7-.6.4-.9 1-1 1.7l-2.7 11.2h3.4l.7-3h3.8c.1.4.2 1.1.2 1.1h3l-1.3-9.3c-.2-1.4-1.2-2.4-3.6-2.4zm.4 3.5c.1 0 .2 0 .3.1.3.2.4.5.5.9l1 5.5h-2.6l1.6-6.4c0-.1.1 0 .1-.1.1 0 0 0 .1 0z" />
                </svg>
              </span>
              {/* Mastercard */}
              <span className="inline-flex items-center justify-center h-9 px-2.5 rounded bg-white shadow-sm" title="Mastercard">
                <svg viewBox="0 0 40 24" className="h-5 w-9" aria-hidden>
                  <circle cx="15" cy="12" r="8" fill="#EB001B" />
                  <circle cx="25" cy="12" r="8" fill="#F79E1B" />
                  <path fill="#FF5F00" d="M20 5.8a8 8 0 0 1 0 12.4 8 8 0 0 1 0-12.4z" />
                </svg>
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
