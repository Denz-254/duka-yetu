import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEnvelope, FaLock, FaStore, FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(username, password);
    if (result.success) {
      if (result.user?.role === 'SUPER_ADMIN') {
        toast.success(result.message || 'Welcome, Super Admin');
        navigate('/admin');
        return;
      }
      if (result.user?.role === 'SHOPPER') {
        toast.success(result.message || 'Welcome back');
        navigate('/shop');
        return;
      }
      if (result.business?.approval_status && result.business.approval_status !== 'APPROVED') {
        toast(result.message || 'Awaiting approval');
        navigate('/pending-approval');
        return;
      }
      toast.success('Welcome back!');
      navigate(result.user?.role === 'CASHIER' ? '/pos' : '/dashboard');
    } else {
      toast.error(result.error || 'Login failed');
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
              <div className="register-brand-tag">Powering local businesses</div>
            </div>
          </div>

          <h1>Manage your business with confidence</h1>
          <p>
            Track sales, manage inventory, monitor customers, and grow your store from one secure workspace.
          </p>

          <ul className="register-points">
            <li>Live sales & performance tracking</li>
            <li>Inventory and stock control</li>
            <li>Marketplace growth and digital payments</li>
          </ul>
        </div>

        <div className="register-form-wrap">
          <div className="register-header">
            <div>
              <p className="register-kicker">Welcome back</p>
              <h2>Sign in</h2>
            </div>
            <Link to="/register">Create account</Link>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            <label className="register-field">
              <span>Username</span>
              <div className="register-input-wrap">
                <FaEnvelope className="register-input-icon" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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

            <div style={{ textAlign: 'right' }}>
              <Link to="/forgot-password" className="register-footer-text" style={{ fontSize: '0.8rem' }}>
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="register-submit">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="register-footer-text">
            Shopping online?{' '}
            <Link to="/shop/register">Create shopper account</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;