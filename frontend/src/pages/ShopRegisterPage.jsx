import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaStore, FaUser, FaEnvelope, FaPhone, FaLock } from 'react-icons/fa';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <Seo
        title="Create shopper account | DukaMall"
        description="Register to shop on DukaMall. We use your details for order delivery, receipts, and support."
        path="/shop/register"
      />
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-block p-3 bg-primary-600 rounded-2xl mb-3">
            <FaStore className="text-white text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Join DukaMall</h1>
          <p className="text-gray-600 text-sm mt-1">
            Shopper account — not for running a business
          </p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-3">
          <div>
            <label className="label-primary">Full name</label>
            <div className="relative">
              <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                className="input-primary pl-10"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
              />
            </div>
          </div>
          <div>
            <label className="label-primary">Email</label>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                className="input-primary pl-10"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@email.com"
              />
            </div>
          </div>
          <div>
            <label className="label-primary">Phone (M-Pesa)</label>
            <div className="relative">
              <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                className="input-primary pl-10"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="07XXXXXXXX"
              />
            </div>
          </div>
          <div>
            <label className="label-primary">Username (optional)</label>
            <input
              className="input-primary"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Leave blank to use email"
            />
          </div>
          <div>
            <label className="label-primary">Password</label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                minLength={8}
                className="input-primary pl-10"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 8 characters"
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Creating…' : 'Create shopper account'}
          </button>
          <p className="text-center text-sm text-gray-600">
            Already shop?{' '}
            <Link to="/login" className="text-primary-600 font-medium">
              Login
            </Link>
          </p>
          <p className="text-center text-xs text-gray-400">
            Selling on Duka Yetu?{' '}
            <Link to="/register" className="underline">
              Open a business account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ShopRegisterPage;
