import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaStore, FaUser, FaEnvelope, FaPhone, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import useAuthStore from '../store/authStore';
import Seo from '../components/common/Seo';

/**
 * Shopper-only registration for DukaMall (separate from business /register).
 */
const ShopRegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    username: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const setAuth = (user, token) => {
    useAuthStore.setState({
      user,
      business: null,
      token: token.access_token,
      isAuthenticated: true,
      loading: false,
    });
    localStorage.setItem('token', token.access_token);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/shop/register', form);
      setAuth(data.user, data.token);
      toast.success('Account created — happy shopping!');
      navigate('/shop/checkout');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shop-register-shell">
      <Seo
        title="Create shopper account | DukaMall"
        description="Register to shop on DukaMall. We use your details for order delivery, receipts, and support."
        path="/shop/register"
      />

      <div className="shop-register-panel">
        <div className="shop-register-hero">
          <div className="shop-register-brand">
            <div className="shop-register-logo">
              <FaStore />
            </div>
            <div>
              <div className="shop-register-name">DukaMall</div>
              <div className="shop-register-tag">Shop Kenya with confidence</div>
            </div>
          </div>

          <h1>Create your shopper account</h1>
          <p>
            View trusted products, pay securely with M-Pesa, and track your orders from verified sellers across Kenya.
          </p>

          <div className="shop-register-points">
            <span>✔ Secure checkout</span>
            <span>✔ Verified sellers</span>
            <span>✔ Fast delivery</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="shop-register-form">
          <div className="shop-register-header">
            <h2>Join DukaMall</h2>
            <p>Welcome back? <Link to="/login">Login</Link></p>
          </div>

          <div className="form-row">
            <label>Full name</label>
            <div className="input-wrap">
              <FaUser className="input-icon" />
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
              />
            </div>
          </div>

          <div className="form-row">
            <label>Email</label>
            <div className="input-wrap">
              <FaEnvelope className="input-icon" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@email.com"
              />
            </div>
          </div>

          <div className="form-row">
            <label>Phone (M-Pesa)</label>
            <div className="input-wrap">
              <FaPhone className="input-icon" />
              <input
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="07XXXXXXXX"
              />
            </div>
          </div>

          <div className="form-row">
            <label>Username</label>
            <input
              className="input-wrap input-wrap--plain"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Optional username"
            />
          </div>

          <div className="form-row">
            <label>Password</label>
            <div className="input-wrap">
              <FaLock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 8 characters"
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="shop-register-submit">
            {loading ? 'Creating account...' : 'Create shopper account'}
          </button>

          <Link to="/shop" className="shop-register-secondary">
            Continue shopping without an account
          </Link>

          <p className="shop-register-footer">
            Selling on DukaYetu?{' '}
            <Link to="/register">Open a business account</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ShopRegisterPage;
