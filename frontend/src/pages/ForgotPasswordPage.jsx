import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaStore } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import Seo from '../components/common/Seo';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [debugUrl, setDebugUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setSent(true);
      if (data.reset_url) setDebugUrl(data.reset_url);
      toast.success(data.message || 'Check your email');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <Seo title="Forgot password | Duka Yetu" description="Reset your Duka Yetu password." path="/forgot-password" noIndex />
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-block p-3 bg-primary-600 rounded-2xl mb-3">
            <FaStore className="text-white text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Forgot password</h1>
          <p className="text-sm text-gray-600 mt-1">We will email a reset link if the account exists</p>
        </div>
        <div className="card">
          {sent ? (
            <div className="text-center space-y-3">
              <p className="text-gray-700 text-sm">
                If that email is registered, a link was sent. Check spam if needed.
              </p>
              {debugUrl && (
                <p className="text-xs break-all text-left bg-amber-50 p-2 rounded text-amber-900">
                  Dev reset link: <a href={debugUrl} className="underline">{debugUrl}</a>
                </p>
              )}
              <Link to="/login" className="btn-primary inline-block">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-primary">Email</label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    className="input-primary pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="account@email.com"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <p className="text-center text-sm">
                <Link to="/login" className="text-primary-600">
                  Back to login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
