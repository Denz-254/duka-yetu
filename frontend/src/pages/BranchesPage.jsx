import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FaBuilding, FaPlus, FaEdit, FaTrash, FaMapMarkerAlt,
  FaPhone, FaEnvelope, FaStore, FaUsers, FaShoppingBag,
  FaChartLine, FaCheckCircle, FaTimesCircle, FaClock
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../utils/helpers';
import { branches as branchesApi } from '../api/endpoints';

const BranchesPage = () => {
  const [branches, setBranches] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', location: '', phone: '', email: '', manager: '', status: 'active',
  });

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const response = await branchesApi.getAll();
      setBranches(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBranches(); }, []);

  const openForm = (branch = null) => {
    setEditingBranch(branch);
    setFormData(branch ? {
      name: branch.name || '', location: branch.location || '', phone: branch.phone || '',
      email: branch.email || '', manager: branch.manager || '', status: branch.status || 'active',
    } : { name: '', location: '', phone: '', email: '', manager: '', status: 'active' });
    setShowModal(true);
  };

  const saveBranch = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (editingBranch) await branchesApi.update(editingBranch.id, formData);
      else await branchesApi.create(formData);
      toast.success(`Branch ${editingBranch ? 'updated' : 'created'} successfully`);
      setShowModal(false);
      await fetchBranches();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save branch');
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-red-600 bg-red-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <FaCheckCircle className="text-green-500" />;
      case 'inactive': return <FaTimesCircle className="text-red-500" />;
      default: return <FaClock className="text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaBuilding className="text-primary-600" />
            Branches
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage your business locations</p>
        </div>
        <button
          onClick={() => {
            openForm();
          }}
          className="btn-primary flex items-center gap-2"
        >
          <FaPlus /> Add Branch
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-primary-600">{branches.length}</p>
          <p className="text-sm text-gray-500">Total Branches</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {branches.filter(b => b.status === 'active').length}
          </p>
          <p className="text-sm text-gray-500">Active Branches</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {branches.reduce((sum, b) => sum + b.staff, 0)}
          </p>
          <p className="text-sm text-gray-500">Total Staff</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-primary-600">
            {formatCurrency(branches.reduce((sum, b) => sum + b.revenue, 0))}
          </p>
          <p className="text-sm text-gray-500">Total Revenue</p>
        </div>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((branch) => (
          <motion.div
            key={branch.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <FaStore className="text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{branch.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <FaMapMarkerAlt className="text-xs" />
                      {branch.location}
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${getStatusColor(branch.status)}`}>
                  {getStatusIcon(branch.status)}
                  {branch.status.charAt(0).toUpperCase() + branch.status.slice(1)}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <FaUsers className="text-xs" />
                  <span>{branch.staff} Staff</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <FaShoppingBag className="text-xs" />
                  <span>{branch.sales} Sales</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <FaPhone className="text-xs" />
                  <span>{branch.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <FaEnvelope className="text-xs" />
                  <span className="truncate">{branch.email}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Manager</p>
                  <p className="text-sm font-medium text-gray-800">{branch.manager}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Revenue</p>
                  <p className="text-sm font-bold text-primary-600">{formatCurrency(branch.revenue)}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    openForm(branch);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => {
                    if (!window.confirm('Are you sure you want to delete this branch?')) return;
                    branchesApi.delete(branch.id)
                      .then(() => { toast.success('Branch deleted successfully'); fetchBranches(); })
                      .catch((error) => toast.error(error.response?.data?.detail || 'Failed to delete branch'));
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Branch Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={saveBranch}>
              <div>
                <label className="label-primary">Branch Name</label>
                <input
                  type="text"
                  className="input-primary bg-white text-gray-800"
                  placeholder="Enter branch name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label-primary">Location</label>
                <input
                  type="text"
                  className="input-primary bg-white text-gray-800"
                  placeholder="Enter location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label-primary">Phone Number</label>
                <input
                  type="tel"
                  className="input-primary bg-white text-gray-800"
                  placeholder="+254 712 345 678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="label-primary">Email</label>
                <input
                  type="email"
                  className="input-primary bg-white text-gray-800"
                  placeholder="branch@dukayetu.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="label-primary">Manager</label>
                <input
                  type="text"
                  className="input-primary bg-white text-gray-800"
                  placeholder="Enter manager name"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                />
              </div>

              <div>
                <label className="label-primary">Status</label>
                <select
                  className="input-primary bg-white text-gray-800"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
                  {loading ? 'Saving...' : editingBranch ? 'Update Branch' : 'Create Branch'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary px-6 py-3"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BranchesPage;