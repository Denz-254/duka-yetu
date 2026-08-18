import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaShoppingCart,
  FaTruck,
  FaUndo,
  FaShieldAlt,
  FaHeadset,
  FaCheck,
  FaHeart,
  FaArrowRight,
  FaEnvelope,
  FaInstagram,
  FaFacebookF,
  FaPinterestP,
  FaYoutube,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import useMarketCartStore from '../store/marketCartStore';
import { formatCurrency } from '../utils/helpers';

const categoryFallbacks = {
  default: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
};

const featurePills = [
  { icon: FaTruck, label: 'Free Delivery', text: 'On orders over KES 3,000' },
  { icon: FaUndo, label: 'Easy Returns', text: '30-day returns' },
  { icon: FaShieldAlt, label: 'Verified Sellers', text: 'Trusted businesses only' },
  { icon: FaHeadset, label: '24/7 Support', text: 'We are here to help' },
];

const footerLinks = {
  quickLinks: ['New In', 'Best Sellers', 'Deals', 'Track Order', 'Contact Us'],
  customerCare: ['FAQs', 'Shipping Policy', 'Returns & Refunds', 'Terms & Conditions', 'Privacy Policy'],
};

const MarketplacePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [dealOfTheDay, setDealOfTheDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [heroIndex, setHeroIndex] = useState(0);
  const addItem = useMarketCartStore((state) => state.addItem);
  const cartCount = useMarketCartStore((state) => state.items.length);

  const heroSlides = useMemo(() => featuredProducts.slice(0, 4), [featuredProducts]);

  useEffect(() => {
    if (heroSlides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setHeroIndex((previous) => (previous + 1) % heroSlides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  const visibleProducts = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') return products;
    return products.filter((product) => product.category_id === selectedCategory);
  }, [products, selectedCategory]);

  useEffect(() => {
    const fetchMarketplaceData = async () => {
      try {
        const [categoriesRes, featuredRes, productsRes, dealRes] = await Promise.all([
          api.get('/marketplace/categories'),
          api.get('/marketplace/featured', { params: { limit: 6 } }),
          api.get('/marketplace/products', { params: { limit: 24 } }),
          api.get('/marketplace/deal-of-the-day').catch(() => ({ data: null })),
        ]);

        setCategories(categoriesRes.data || []);
        setFeaturedProducts(featuredRes.data || []);
        setProducts(productsRes.data?.items || []);
        setDealOfTheDay(dealRes.data || null);
      } catch (error) {
        toast.error('Unable to load marketplace data');
      } finally {
        setLoading(false);
      }
    };

    fetchMarketplaceData();
  }, []);

  const handleAddToCart = (product) => {
    addItem(product, 1);
    toast.success(`${product.name} added to cart`);
  };

  const categoryImageMap = {
    Fashion: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
    Home: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
    Beauty: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
    Electronics: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80',
    Lifestyle: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
    Women: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
    Men: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
    Default: categoryFallbacks.default,
  };

  const categoryCards = categories.length
    ? categories.map((category) => ({
        title: category.name,
        subtitle: 'Shop Now',
        image: categoryImageMap[category.name] || categoryImageMap.Default,
      }))
    : [
        { title: 'Fashion', subtitle: 'Shop Now', image: categoryImageMap.Fashion },
        { title: 'Home', subtitle: 'Shop Now', image: categoryImageMap.Home },
        { title: 'Beauty', subtitle: 'Shop Now', image: categoryImageMap.Beauty },
        { title: 'Electronics', subtitle: 'Shop Now', image: categoryImageMap.Electronics },
        { title: 'Lifestyle', subtitle: 'Shop Now', image: categoryImageMap.Lifestyle },
      ];

  const featuredActive = heroSlides[heroIndex] || heroSlides[0] || null;

  return (
    <div className="shop-page">
      <div className="top-banner">
        <div className="banner-inner">
          <div className="banner-pill">
            <span className="banner-icon-wrap"><FaTruck /></span>
            <span>FREE DELIVERY</span>
            <span className="banner-sub">On orders over KES 3,000</span>
          </div>
          <div className="banner-pill banner-pill--secondary">
            <span className="banner-icon-wrap"><FaShieldAlt /></span>
            <span>SAFE PAYMENTS</span>
            <span className="banner-sub">M-Pesa &amp; secure checkout</span>
          </div>
          <Link to="/shop/checkout" className="banner-button">Cart ({cartCount})</Link>
        </div>
      </div>

      <header className="shop-header">
        <div className="shop-header__inner">
          <div className="brand-block">
            <div className="brand-icon">
              <FaShoppingCart />
            </div>
            <div>
              <div className="brand-name">DukaMall</div>
              <div className="brand-tag">The trusted home of Kenyan essentials.</div>
            </div>
          </div>

          <nav className="main-nav" aria-label="Main navigation">
            <a href="#">New In</a>
            <a href="#">Categories</a>
            <a href="#">Top Picks</a>
            <a href="#">Deals</a>
            <a href="#">Support</a>
          </nav>

          <Link to="/shop/checkout" className="shop-button">SHOP NOW</Link>
        </div>
      </header>

      <main className="shop-main">
        {featuredActive && (
          <section className="hero-shell" style={{ backgroundImage: `linear-gradient(135deg, rgba(6, 50, 44, 0.9), rgba(12, 68, 58, 0.8)), url(${featuredActive.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80'})` }}>
            <div className="hero-copy">
              <span className="eyebrow">{featuredActive.featured_badge || 'FEATURED DEAL'}</span>
              <h1>
                {featuredActive.name}
                <span>At {formatCurrency(featuredActive.selling_price)}</span>
              </h1>
              <p>{featuredActive.description || 'Discover fresh finds from verified Kenyan sellers.'}</p>

              <div className="hero-features">
                <div className="small-feature">
                  <span className="feature-icon"><FaCheck /></span>
                  <span>Best Prices Guaranteed</span>
                </div>
                <div className="small-feature">
                  <span className="feature-icon"><FaShieldAlt /></span>
                  <span>Secure Payments</span>
                </div>
                <div className="small-feature">
                  <span className="feature-icon"><FaTruck /></span>
                  <span>Fast Delivery Across Kenya</span>
                </div>
              </div>

              <div className="hero-actions">
                <Link to={`/shop/product/${featuredActive.id}`} className="explore-button">
                  EXPLORE COLLECTION <FaArrowRight />
                </Link>
                <button type="button" className="explore-button secondary" onClick={() => handleAddToCart(featuredActive)}>
                  ADD TO CART
                </button>
              </div>

              {heroSlides.length > 1 && (
                <div className="slider-dots" aria-label="Featured products slider">
                  {heroSlides.map((slide, index) => (
                    <button
                      key={slide.id || `${slide.name}-${index}`}
                      type="button"
                      className={`slider-dot ${index === heroIndex ? 'is-active' : ''}`}
                      onClick={() => setHeroIndex(index)}
                      aria-label={`Show featured product ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

          </section>
        )}

        {!featuredActive && (
          <section className="hero-shell" style={{ backgroundImage: 'linear-gradient(135deg, rgba(6, 50, 44, 0.9), rgba(12, 68, 58, 0.8)), url(https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80)' }}>
            <div className="hero-copy">
              <span className="eyebrow">FEATURED DEAL</span>
              <h1>
                Discover
                <span>Best Sellers</span>
              </h1>
              <p>Shop trusted products from verified sellers across Kenya.</p>
              <div className="hero-actions">
                <button type="button" className="explore-button" onClick={() => window.scrollTo({ top: 520, behavior: 'smooth' })}>
                  EXPLORE COLLECTION <FaArrowRight />
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="info-strip">
          {featurePills.map(({ icon: Icon, label, text }) => (
            <div key={label} className="info-pill">
              <div className="info-pill__icon">
                <Icon />
              </div>
              <div>
                <strong>{label}</strong>
                <span>{text}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="category-section">
          <h2>Shop By Category</h2>
          <div className="category-grid">
            <button type="button" className={`category-filters ${selectedCategory === 'all' ? 'is-active' : ''}`} onClick={() => setSelectedCategory('all')}>
              All Products
            </button>
            {categoryCards.map((card) => (
              <article key={card.title} className="category-card">
                <div className="category-image-wrap">
                  <img src={card.image} alt={card.title} />
                </div>
                <div className="category-card__meta">
                  <span>{card.title}</span>
                  <button type="button" onClick={() => setSelectedCategory(categories.find((category) => category.name === card.title)?.id || 'all')}>
                    {card.subtitle} <FaArrowRight />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="deal-banner">
          <div className="deal-copy">
            <p className="deal-label">DEAL OF THE DAY</p>
            <h3>
              Grab It Before
              <span>It’s Gone!</span>
            </h3>
            <p className="deal-sub">Premium offers from verified Kenyan sellers.</p>
            <button type="button" className="deal-button" onClick={() => setSelectedCategory('all')}>SHOP THE DEAL <FaArrowRight /></button>
          </div>

          <div className="watch-display">
            <div className="watch-header">
              <span>{dealOfTheDay?.name || featuredProducts[1]?.name || 'Smart Watch Pro'}</span>
              <span className="watch-chip">Trending now</span>
            </div>

            <div className="watch-card">
              <div className="watch-case">
                <div className="watch-face">
                  <div className="watch-face__inner">
                    <div className="watch-ring ring-1" />
                    <div className="watch-ring ring-2" />
                    <div className="watch-ring ring-3" />
                  </div>
                </div>
              </div>
            </div>

            <div className="watch-price-row">
              <strong>{formatCurrency(dealOfTheDay?.selling_price || featuredProducts[1]?.selling_price || 5999)}</strong>
              <span>{formatCurrency((dealOfTheDay?.selling_price || featuredProducts[1]?.selling_price || 5999) * 1.8)}</span>
            </div>
            <p className="watch-note">Only limited stock left!</p>

            <div className="countdown-row">
              <div><span>08</span><small>HRS</small></div>
              <div><span>12</span><small>MINS</small></div>
              <div><span>45</span><small>SECS</small></div>
              <div><span>30</span><small>MSEC</small></div>
            </div>
          </div>
        </section>

        <section className="new-arrivals">
          <div className="section-header">
            <h2>New Arrivals</h2>
            <button type="button" className="view-all-link" onClick={() => setSelectedCategory('all')}>View All <FaArrowRight /></button>
          </div>

          <div className="arrival-grid">
            {loading ? (
              <div className="loading-box">Loading products...</div>
            ) : visibleProducts.length ? (
              visibleProducts.slice(0, 8).map((item) => (
                <article key={item.id} className="arrival-card">
                  <div className="arrival-card__top">
                    <span className="arrival-badge">{item.is_featured ? (item.featured_badge || 'Featured') : 'NEW'}</span>
                    <button type="button" className="wishlist-btn" aria-label="Add to wishlist">
                      <FaHeart />
                    </button>
                  </div>
                  <Link to={`/shop/product/${item.id}`} className="arrival-image-wrap">
                    <img src={item.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80'} alt={item.name} />
                  </Link>
                  <div className="arrival-card__meta">
                    <Link to={`/shop/product/${item.id}`}><h4>{item.name}</h4></Link>
                    <div className="price-row">
                      <span>{formatCurrency(item.selling_price)}</span>
                      <button type="button" className="cart-mini" aria-label="Add to cart" onClick={() => handleAddToCart(item)}>
                        <FaShoppingCart />
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="loading-box">No products found in this category.</div>
            )}
          </div>
        </section>

        <section className="newsletter-strip">
          <div className="newsletter-inner">
            <div className="newsletter-copy">
              <span className="newsletter-icon"><FaEnvelope /></span>
              <span>Get Exclusive Offers &amp; Updates</span>
            </div>
            <div className="newsletter-form">
              <input type="email" placeholder="Enter your email address" aria-label="Email address" />
              <button type="button">SUBSCRIBE</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="shop-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="brand-block brand-block--footer">
              <div className="brand-icon">
                <FaShoppingCart />
              </div>
              <div>
                <div className="brand-name">DukaMall</div>
                <div className="brand-tag">The trusted home of Kenyan essentials.</div>
              </div>
            </div>
            <p>Your one-stop destination for quality products at unbeatable prices.</p>
            <div className="socials">
              <span><FaFacebookF /></span>
              <span><FaInstagram /></span>
              <span><FaPinterestP /></span>
              <span><FaYoutube /></span>
            </div>
          </div>

          <div className="footer-column">
            <h4>QUICK LINKS</h4>
            <ul>
              {footerLinks.quickLinks.map((link) => (
                <li key={link}><a href="#">{link}</a></li>
              ))}
            </ul>
          </div>

          <div className="footer-column">
            <h4>CUSTOMER CARE</h4>
            <ul>
              {footerLinks.customerCare.map((link) => (
                <li key={link}><a href="#">{link}</a></li>
              ))}
            </ul>
          </div>

          <div className="footer-column">
            <h4>CONTACT US</h4>
            <ul className="contact-list">
              <li><a href="mailto:support@dukamall.co.ke">support@dukamall.co.ke</a></li>
              <li><a href="tel:+254700000000">+254 700 000 000</a></li>
              <li>Nairobi, Kenya</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 DukaMall. All rights reserved.</span>
          <span>We use secure checkout and trusted local payment options. <a href="#">Unsubscribe</a></span>
        </div>
      </footer>
    </div>
  );
};

export default MarketplacePage;
