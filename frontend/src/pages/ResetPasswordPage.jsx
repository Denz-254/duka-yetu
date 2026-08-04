import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaLock, FaStore } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import Seo from '../components/common/Seo';

const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (!token) {
      toast.error('Invalid reset link');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      toast.success('Password updated');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <Seo title="Reset password | Duka Yetu" path="/reset-password" noIndex />
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-block p-3 bg-primary-600 rounded-2xl mb-3">
            <FaStore className="text-white text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Set new password</h1>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          {!token && (
            <p className="text-sm text-red-600">This link is invalid. Request a new one.</p>
          )}
          <div>
            <label className="label-primary">New password</label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                minLength={8}
                className="input-primary pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label-primary">Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              className="input-primary"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading || !token} className="btn-primary w-full py-3">
            {loading ? 'Saving…' : 'Update password'}
          </button>
          <p className="text-center text-sm">
            <Link to="/login" className="text-primary-600">
              Back to login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
