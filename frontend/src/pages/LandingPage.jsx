import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaStore, 
  FaUsers, 
  FaShoppingCart, 
  FaChartLine, 
  FaBox, 
  FaMoneyBillWave,
  FaArrowRight,
  FaCheckCircle,
  FaMobileAlt,
  FaShieldAlt,
  FaClock,
  FaStar,
  FaQuoteLeft,
  FaCrown,
  FaRocket,
  FaGem,
  FaBolt,
  FaHeadset,
  FaGlobeAfrica
} from 'react-icons/fa';

const LandingPage = () => {
  const features = [
    { icon: FaShoppingCart, title: 'POS System', description: 'Fast and intuitive point of sale for your business' },
    { icon: FaBox, title: 'Inventory Management', description: 'Track stock levels and get low stock alerts' },
    { icon: FaUsers, title: 'Staff Management', description: 'Manage staff roles and permissions easily' },
    { icon: FaChartLine, title: 'Real-time Analytics', description: 'Monitor sales and business performance' },
    { icon: FaMobileAlt, title: 'Mobile Friendly', description: 'Access your business from anywhere' },
    { icon: FaShieldAlt, title: 'Secure & Reliable', description: 'Bank-grade security for your data' },
  ];

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      icon: FaRocket,
      price: 'KSh 2,500',
      period: '/month',
      description: 'Perfect for small businesses starting out',
      features: [
        'Single branch',
        'Up to 3 staff accounts',
        'Unlimited products',
        'Basic reports',
        '24/7 email support',
      ],
      buttonText: 'Start Free Trial',
    },
    {
      id: 'professional',
      name: 'Professional',
      icon: FaCrown,
      price: 'KSh 5,000',
      period: '/month',
      description: 'For growing businesses with multiple locations',
      features: [
        'Multiple branches',
        'Up to 15 staff accounts',
        'Advanced inventory',
        'Branch comparison reports',
        'Priority support',
      ],
      buttonText: 'Start Free Trial',
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      icon: FaGem,
      price: 'KSh 10,000',
      period: '/month',
      description: 'For large businesses with complex needs',
      features: [
        'Unlimited branches',
        'Unlimited staff accounts',
        'Custom integrations',
        'Advanced analytics',
        'Dedicated account manager',
      ],
      buttonText: 'Start Free Trial',
    },
  ];

  const testimonials = [
    {
      name: 'Grace Muthoni',
      business: 'Green Valley Supermarket',
      quote: 'Duka Yetu has transformed how we manage our inventory. We can now track sales in real-time and never run out of stock.',
      rating: 5,
    },
    {
      name: 'James Ochieng',
      business: 'Sunrise Hardware',
      quote: 'The POS system is so intuitive that my staff learned it in minutes. Our checkout times have reduced by half!',
      rating: 5,
    },
    {
      name: 'Sarah Wanjiru',
      business: 'Tasty Bites Restaurant',
      quote: 'Managing multiple branches is now a breeze. I can see performance of each branch from one dashboard.',
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-primary-100/80 bg-white/90 backdrop-blur-xl">
        <div className="container mx-auto flex h-18 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 shadow-lg shadow-primary-600/20">
              <FaStore className="text-white" />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-primary-900">Duka Yetu</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-gray-600 md:flex">
            <a href="#features" className="hover:text-primary-700">Features</a>
            <a href="#how-it-works" className="hover:text-primary-700">How it works</a>
            <a href="#pricing" className="hover:text-primary-700">Pricing</a>
            <Link to="/shop" className="hover:text-primary-700">Shop</Link>
            <a href="#stories" className="hover:text-primary-700">Customers</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/shop" className="hidden px-3 py-2 text-sm font-semibold text-orange-600 hover:text-orange-700 sm:block">
              DukaMall
            </Link>
            <Link to="/login" className="hidden px-3 py-2 text-sm font-semibold text-gray-700 hover:text-primary-700 sm:block">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary text-sm font-semibold">
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 to-white">
        <div className="absolute inset-0 bg-grid-primary/5 bg-[size:40px_40px]" />
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            {/* Hero Content */}
            <div className="lg:w-1/2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                  </span>
                  Trusted by 1,000+ businesses
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight"
              >
                The All-in-One
                <br />
                <span className="text-primary-600">Business Management</span>
                <br />
                Solution
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg text-gray-600 max-w-xl"
              >
                Manage sales, inventory, staff, and branches from one powerful platform. 
                Built for small and medium businesses in Kenya.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-wrap items-center gap-4"
              >
                <Link
                  to="/register"
                  className="btn-primary px-8 py-3 text-lg flex items-center gap-2"
                >
                  Start Free Trial
                  <FaArrowRight className="text-sm" />
                </Link>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
                >
                  Sign in →
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex items-center gap-6 text-sm text-gray-500"
              >
                <span className="flex items-center gap-1">
                  <FaCheckCircle className="text-primary-500" />
                  No credit card
                </span>
                <span className="flex items-center gap-1">
                  <FaCheckCircle className="text-primary-500" />
                  14-day free trial
                </span>
                <span className="flex items-center gap-1">
                  <FaCheckCircle className="text-primary-500" />
                  Cancel anytime
                </span>
              </motion.div>
            </div>

            {/* Hero Image */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="lg:w-1/2"
            >
              <div className="relative">
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary-200 rounded-full blur-2xl opacity-50" />
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                  <div className="p-4 bg-primary-50 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                          <FaStore className="text-primary-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Duka Yetu Store</p>
                          <p className="text-xs text-gray-500">Nairobi, Kenya</p>
                        </div>
                      </div>
                      <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full">Live</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-primary-600">KSh 24,360</p>
                        <p className="text-xs text-gray-500">Today's Sales</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-blue-600">45</p>
                        <p className="text-xs text-gray-500">Orders</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-green-600">12</p>
                        <p className="text-xs text-gray-500">Products</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="border-y border-primary-100 bg-primary-900 py-8 text-white">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 text-center md:grid-cols-4">
          {[
            ['1,000+', 'Businesses'],
            ['99.9%', 'Platform uptime'],
            ['40%', 'Faster checkout'],
            ['24/7', 'Business visibility'],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="text-2xl font-extrabold md:text-3xl">{value}</p>
              <p className="mt-1 text-xs font-medium text-primary-200 md:text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="scroll-mt-20 py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Everything You Need to Grow</h2>
            <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
              Powerful features designed to help you manage and scale your business
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300"
                >
                  <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="text-primary-600 text-xl" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-500">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-primary-600">Simple by design</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">Open your smarter shop in minutes</h2>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {[
              { icon: FaStore, step: '01', title: 'Create your store', text: 'Add your business details, products, and team from one guided workspace.' },
              { icon: FaBolt, step: '02', title: 'Start selling', text: 'Use the fast POS, accept your preferred payments, and issue clear receipts.' },
              { icon: FaChartLine, step: '03', title: 'Grow with clarity', text: 'Track stock, revenue, staff, and branches with live business insights.' },
            ].map(({ icon: Icon, step, title, text }) => (
              <div key={step} className="relative rounded-2xl border border-primary-100 bg-primary-50/50 p-6">
                <span className="absolute right-5 top-4 text-4xl font-black text-primary-100">{step}</span>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white">
                  <Icon />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="scroll-mt-20 py-20 bg-primary-50/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Simple, Transparent Pricing</h2>
            <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
              Choose the plan that fits your business needs
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className={`relative bg-white rounded-xl shadow-sm border ${
                    plan.popular ? 'border-primary-500 shadow-lg' : 'border-gray-100'
                  } p-6 hover:shadow-md transition-all duration-300`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${plan.popular ? 'bg-primary-100' : 'bg-gray-100'}`}>
                      <Icon className={`${plan.popular ? 'text-primary-600' : 'text-gray-600'} text-xl`} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <FaCheckCircle className="text-primary-500 text-xs" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className={`w-full block text-center py-2 rounded-lg font-medium transition-colors ${
                      plan.popular
                        ? 'btn-primary'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {plan.buttonText}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="stories" className="scroll-mt-20 py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">What Our Customers Say</h2>
            <p className="text-gray-600 mt-2">Join 1,000+ businesses already growing with Duka Yetu</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
              >
                <FaQuoteLeft className="text-primary-200 text-2xl mb-4" />
                <p className="text-gray-700 text-sm leading-relaxed mb-4">{testimonial.quote}</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 font-bold text-lg">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{testimonial.name}</p>
                    <p className="text-xs text-gray-500">{testimonial.business}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FaStar key={i} className="text-yellow-400 text-xs" />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-primary-100 bg-gray-50 py-12">
        <div className="container mx-auto grid gap-6 px-4 md:grid-cols-3">
          {[
            { icon: FaShieldAlt, title: 'Your data stays protected', text: 'Tenant-isolated records and role-based access keep each business secure.' },
            { icon: FaHeadset, title: 'Support when it matters', text: 'Get practical help from a team that understands growing Kenyan businesses.' },
            { icon: FaGlobeAfrica, title: 'Built for local commerce', text: 'KES pricing, familiar workflows, and support for the ways your customers pay.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <Icon className="mt-1 shrink-0 text-xl text-primary-600" />
              <div>
                <h3 className="font-bold text-gray-900">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-gray-600">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Grow Your Business?
          </h2>
          <p className="text-primary-100 text-lg max-w-2xl mx-auto mb-8">
            Join thousands of business owners who trust Duka Yetu to manage their operations.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors text-lg"
          >
            Start Free Trial
            <FaArrowRight className="text-sm" />
          </Link>
          <p className="text-primary-200 text-sm mt-4">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>
      <footer className="bg-primary-900 px-4 py-10 text-primary-100">
        <div className="container mx-auto flex flex-col items-center justify-between gap-5 md:flex-row">
          <div className="flex items-center gap-3">
            <FaStore className="text-primary-400" />
            <span className="font-bold text-white">Duka Yetu</span>
            <span className="text-sm text-primary-300">Built for businesses that are going places.</span>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <Link to="/login" className="hover:text-white">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;