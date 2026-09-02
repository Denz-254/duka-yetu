import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaUserPlus, FaUserMinus, FaKey, FaTimes, FaLock } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import api from '../api/client';
import Modal from '../components/common/Modal';

const StaffPage = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [resetModal, setResetModal] = useState({ open: false, id: null });
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    role: 'CASHIER',
  });
  const user = useAuthStore((state) => state.user);
  const isOwner = user?.role === 'OWNER';

  useEffect(() => {
    if (isOwner) {
      fetchStaff();
    }
  }, [isOwner]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/');
      setStaff(response.data.items || []);
    } catch (error) {
      console.error('Fetch staff error:', error);
      toast.error(error.response?.data?.detail || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingStaff) {
        const updateData = { ...formData };
        delete updateData.password;
        await api.put(`/users/${editingStaff.id}`, updateData);
        toast.success('Staff updated successfully');
      } else {
        await api.post('/users/', formData);
        toast.success('Staff created successfully');
      }
      setShowForm(false);
      setEditingStaff(null);
      setFormData({ name: '', email: '', phone: '', username: '', password: '', role: 'CASHIER' });
      fetchStaff();
    } catch (error) {
      console.error('Save staff error:', error);
      toast.error(error.response?.data?.detail || 'Failed to save staff');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (staffId, isActive) => {
    try {
      await api.post(`/users/${staffId}/toggle`);
      toast.success(`Staff ${isActive ? 'disabled' : 'enabled'} successfully`);
      fetchStaff();
    } catch (error) {
      console.error('Toggle status error:', error);
      toast.error('Failed to toggle staff status');
    }
  };

  const handleResetPassword = async () => {
    if (!resetModal.id) return;
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      await api.post(`/users/${resetModal.id}/reset-password`, { new_password: newPassword });
      toast.success('Password reset successfully');
      setResetModal({ open: false, id: null });
      setNewPassword('');
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/users/${deleteId}`);
      toast.success('Staff deleted successfully');
      setDeleteId(null);
      fetchStaff();
    } catch (error) {
      toast.error('Failed to delete staff');
    }
  };

  const filteredStaff = staff.filter((member) =>
    member.name.toLowerCase().includes(search.toLowerCase()) ||
    member.username.toLowerCase().includes(search.toLowerCase()) ||
    member.email.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOwner) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4 text-gray-300 flex justify-center"><FaLock /></div>
        <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
        <p className="text-gray-500 mt-2">Only owners can manage staff</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaUserPlus className="text-primary-600" />
          Staff Management
        </h1>
        <button
          onClick={() => {
            setEditingStaff(null);
            setFormData({ name: '', email: '', phone: '', username: '', password: '', role: 'CASHIER' });
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <FaPlus /> Add Staff
        </button>
      </div>

      <div className="card">
        <div className="relative mb-4">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-primary pl-10"
            placeholder="Search staff..."
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Username</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Email</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Role</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Status</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-400">Loading...</td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-400">No staff found</td>
                </tr>
              ) : (
                filteredStaff.map((member) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-gray-100 hover:bg-primary-50 transition-colors"
                  >
                    <td className="py-3 px-2 text-sm font-medium">{member.name}</td>
                    <td className="py-3 px-2 text-sm text-gray-500">{member.username}</td>
                    <td className="py-3 px-2 text-sm text-gray-500">{member.email}</td>
                    <td className="py-3 px-2 text-sm">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                        member.role === 'OWNER' ? 'bg-purple-100 text-purple-600' :
                        member.role === 'ADMIN' ? 'bg-blue-100 text-blue-600' :
                        member.role === 'MANAGER' ? 'bg-orange-100 text-orange-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                        member.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingStaff(member);
                            setFormData({
                              name: member.name,
                              email: member.email,
                              phone: member.phone || '',
                              username: member.username,
                              password: '',
                              role: member.role,
                            });
                            setShowForm(true);
                          }}
                          className="p-1 text-blue-500 hover:text-blue-600"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(member.id, member.is_active)}
                          className={`p-1 ${member.is_active ? 'text-red-400 hover:text-red-600' : 'text-green-400 hover:text-green-600'}`}
                          title={member.is_active ? 'Disable' : 'Enable'}
                        >
                          {member.is_active ? <FaUserMinus /> : <FaUserPlus />}
                        </button>
                        <button
                          onClick={() => setResetModal({ open: true, id: member.id })}
                          className="p-1 text-yellow-500 hover:text-yellow-600"
                          title="Reset Password"
                        >
                          <FaKey />
                        </button>
                        {member.role !== 'OWNER' && (
                          <button
                            onClick={() => setDeleteId(member.id)}
                            className="p-1 text-red-500 hover:text-red-600"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {editingStaff ? 'Edit Staff' : 'Add Staff'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingStaff(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-primary">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input-primary bg-white text-gray-800"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label className="label-primary">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-primary bg-white text-gray-800"
                  placeholder="Enter email"
                  required
                />
              </div>

              <div>
                <label className="label-primary">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-primary bg-white text-gray-800"
                  placeholder="+254712345678"
                />
              </div>

              <div>
                <label className="label-primary">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="input-primary bg-white text-gray-800"
                  placeholder="Choose a username"
                  required
                />
              </div>

              {!editingStaff && (
                <div>
                  <label className="label-primary">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input-primary bg-white text-gray-800"
                    placeholder="Min 8 characters"
                    required
                  />
                </div>
              )}

              <div>
                <label className="label-primary">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="input-primary bg-white text-gray-800"
                  required
                >
                  <option value="CASHIER">Cashier</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 py-3"
                >
                  {loading ? 'Saving...' : editingStaff ? 'Update Staff' : 'Create Staff'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingStaff(null);
                  }}
                  className="btn-secondary px-6 py-3"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <Modal open={!!deleteId} title="Delete staff" confirmLabel="Delete" danger onClose={() => setDeleteId(null)} onConfirm={handleDelete}>
        Are you sure you want to delete this staff member?
      </Modal>
      <Modal
        open={resetModal.open}
        title="Reset password"
        confirmLabel="Reset"
        onClose={() => { setResetModal({ open: false, id: null }); setNewPassword(''); }}
        onConfirm={handleResetPassword}
      >
        <input
          type="password"
          className="input-primary w-full bg-white text-gray-800"
          placeholder="New password (min 8)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default StaffPage;