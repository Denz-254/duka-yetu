import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaStore, FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaBuilding, FaSave, FaCamera } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { business as businessApi, upload } from '../api/endpoints';

const BusinessProfilePage = () => {
  const [loading, setLoading] = useState(false);
  const [business, setBusiness] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Kenya',
    logo: '',
    tax_id: '',
    description: '',
  });

  useEffect(() => {
    fetchBusinessProfile();
  }, []);

  const fetchBusinessProfile = async () => {
    setLoading(true);
    try {
      const response = await businessApi.getProfile();
      setBusiness((current) => ({ ...current, ...response.data }));
    } catch (error) {
      toast.error('Failed to load business profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await businessApi.updateProfile(business);
      toast.success('Business profile updated successfully');
    } catch (error) {
      toast.error('Failed to update business profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const response = await upload.image(file);
      const updated = { ...business, logo: response.data.url };
      setBusiness(updated);
      await businessApi.updateProfile(updated);
      toast.success('Business logo updated');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload logo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaStore className="text-primary-600" />
          Business Profile
        </h1>
        <p className="text-gray-500 text-sm mt-1">Manage your business information</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
            <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 relative">
              {business.logo ? (
                <img src={business.logo} alt="Business logo" className="w-full h-full rounded-full object-cover" />
              ) : (
                <FaStore className="text-primary-600 text-3xl" />
              )}
              <label className="absolute bottom-0 right-0 p-1 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors cursor-pointer">
                <FaCamera className="text-xs" />
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{business.name}</h3>
              <p className="text-sm text-gray-500">{business.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-primary">Business Name</label>
              <input
                type="text"
                value={business.name}
                onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                className="input-primary bg-white text-gray-800"
                required
              />
            </div>
            <div>
              <label className="label-primary">Email</label>
              <input
                type="email"
                value={business.email}
                onChange={(e) => setBusiness({ ...business, email: e.target.value })}
                className="input-primary bg-white text-gray-800"
                required
              />
            </div>
            <div>
              <label className="label-primary">Phone Number</label>
              <input
                type="tel"
                value={business.phone}
                onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                className="input-primary bg-white text-gray-800"
              />
            </div>
            <div>
              <label className="label-primary">Tax ID</label>
              <input
                type="text"
                value={business.tax_id}
                onChange={(e) => setBusiness({ ...business, tax_id: e.target.value })}
                className="input-primary bg-white text-gray-800"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label-primary">Address</label>
              <input
                type="text"
                value={business.address}
                onChange={(e) => setBusiness({ ...business, address: e.target.value })}
                className="input-primary bg-white text-gray-800"
              />
            </div>
            <div>
              <label className="label-primary">City</label>
              <input
                type="text"
                value={business.city}
                onChange={(e) => setBusiness({ ...business, city: e.target.value })}
                className="input-primary bg-white text-gray-800"
              />
            </div>
            <div>
              <label className="label-primary">Country</label>
              <input
                type="text"
                value={business.country}
                onChange={(e) => setBusiness({ ...business, country: e.target.value })}
                className="input-primary bg-white text-gray-800"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label-primary">Description</label>
              <textarea
                value={business.description}
                onChange={(e) => setBusiness({ ...business, description: e.target.value })}
                className="input-primary bg-white text-gray-800"
                rows="3"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button type="submit" className="btn-primary flex items-center gap-2">
              <FaSave /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BusinessProfilePage;