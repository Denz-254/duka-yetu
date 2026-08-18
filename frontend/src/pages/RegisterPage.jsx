import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaStore, FaUser, FaEnvelope, FaPhone, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    business_name: '',
    owner_name: '',
    phone: '',
    email: '',
    password: '',
    username: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await register(formData);
    if (result.success) {
      toast.success(result.message || 'Registration submitted for approval');
      navigate('/pending-approval');
    } else {
      toast.error(result.error || 'Registration failed');
    }
  };

  return (
    <div className="register-shell">
      <motion.div
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="register-panel"
      >
        <div className="register-hero">
          <div className="register-brand">
            <div className="register-logo">
              <FaStore />
            </div>
            <div>
              <div className="register-brand-name">Duka Yetu</div>
              <div className="register-brand-tag">Grow your business</div>
            </div>
          </div>

          <h1>Launch your store in minutes</h1>
          <p>
            Manage inventory, accept payments, track sales, and serve customers in one secure business dashboard.
          </p>

          <ul className="register-points">
            <li>Secure POS & sales tracking</li>
            <li>Inventory and stock control</li>
            <li>Marketplace & growing customer base</li>
          </ul>
        </div>

        <div className="register-form-wrap">
          <div className="register-header">
            <div>
              <p className="register-kicker">Business account</p>
              <h2>Create account</h2>
            </div>
            <Link to="/login">Already signed in?</Link>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            <label className="register-field">
              <span>Business name</span>
              <div className="register-input-wrap">
                <FaStore className="register-input-icon" />
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                  placeholder="Your business name"
                  required
                />
              </div>
            </label>

            <label className="register-field">
              <span>Owner name</span>
              <div className="register-input-wrap">
                <FaUser className="register-input-icon" />
                <input
                  type="text"
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                />
              </div>
            </label>

            <label className="register-field">
              <span>Phone number</span>
              <div className="register-input-wrap">
                <FaPhone className="register-input-icon" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+254712345678"
                  required
                />
              </div>
            </label>

            <label className="register-field">
              <span>Email</span>
              <div className="register-input-wrap">
                <FaEnvelope className="register-input-icon" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  required
                />
              </div>
            </label>

            <label className="register-field">
              <span>Username</span>
              <div className="register-input-wrap">
                <FaUser className="register-input-icon" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                  required
                />
              </div>
            </label>

            <label className="register-field">
              <span>Password</span>
              <div className="register-input-wrap">
                <FaLock className="register-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 8 characters"
                  required
                />
                <button
                  type="button"
                  className="register-password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </label>

            <button type="submit" disabled={loading} className="register-submit">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="register-footer-text">
            Looking to shop instead?{' '}
            <Link to="/shop/register">Open a shopper account</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;