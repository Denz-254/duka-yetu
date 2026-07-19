import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaStore, FaUser, FaEnvelope, FaPhone, FaLock } from 'react-icons/fa';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-primary-600 rounded-2xl mb-4">
            <FaStore className="text-white text-4xl" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Duka Yetu</h1>
          <p className="text-gray-600 mt-2">Create your business account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="label-primary">Business Name</label>
              <div className="relative">
                <FaStore className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                  className="input-primary pl-10"
                  placeholder="Your business name"
                  required
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="label-primary">Owner Name</label>
              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleChange}
                  className="input-primary pl-10"
                  placeholder="Your full name"
                  required
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="label-primary">Phone Number</label>
              <div className="relative">
                <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-primary pl-10"
                  placeholder="+254712345678"
                  required
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="label-primary">Email</label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-primary pl-10"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="label-primary">Username</label>
              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="input-primary pl-10"
                  placeholder="Choose a username"
                  required
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="label-primary">Password</label>
              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-primary pl-10"
                  placeholder="Min 8 characters"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-lg py-3"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Login
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;