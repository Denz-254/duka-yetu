import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaTruck, FaPlus, FaEdit, FaTrash, FaSearch,
  FaPhone, FaEnvelope, FaMapMarkerAlt, FaUser,
  FaBoxes, FaClock, FaCheckCircle, FaTimesCircle,
  FaFileInvoice, FaDownload, FaFilter, FaSort
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { suppliers as suppliersApi } from '../api/endpoints';
import { formatCurrency } from '../utils/helpers';

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Kenya',
    tax_id: '',
    payment_terms: '30',
    status: 'active',
    notes: '',
    products: [],
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await suppliersApi.getAll();
      setSuppliers(response.data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingSupplier) {
        await suppliersApi.update(editingSupplier.id, formData);
        toast.success('Supplier updated successfully');
      } else {
        await suppliersApi.create(formData);
        toast.success('Supplier created successfully');
      }
      setShowModal(false);
      setEditingSupplier(null);
      setFormData({
        name: '',
        contact_name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: 'Kenya',
        tax_id: '',
        payment_terms: '30',
        status: 'active',
        notes: '',
        products: [],
      });
      fetchSuppliers();
    } catch (error) {
      toast.error('Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await suppliersApi.delete(id);
        toast.success('Supplier deleted successfully');
        fetchSuppliers();
      } catch (error) {
        toast.error('Failed to delete supplier');
      }
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

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.products.some(p => p.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaTruck className="text-primary-600" />
            Suppliers
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage your product suppliers and vendors</p>
        </div>
        <button
          onClick={() => {
            setEditingSupplier(null);
            setFormData({
              name: '',
              contact_name: '',
              email: '',
              phone: '',
              address: '',
              city: '',
              country: 'Kenya',
              tax_id: '',
              payment_terms: '30',
              status: 'active',
              notes: '',
              products: [],
            });
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <FaPlus /> Add Supplier
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-primary-600">{suppliers.length}</p>
          <p className="text-sm text-gray-500">Total Suppliers</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {suppliers.filter(s => s.status === 'active').length}
          </p>
          <p className="text-sm text-gray-500">Active Suppliers</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {suppliers.reduce((sum, s) => sum + (s.total_orders || 0), 0)}
          </p>
          <p className="text-sm text-gray-500">Total Orders</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-primary-600">
            {formatCurrency(suppliers.reduce((sum, s) => sum + (s.total_purchases || 0), 0))}
          </p>
          <p className="text-sm text-gray-500">Total Purchases</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-primary pl-10"
            placeholder="Search suppliers by name, contact, email, or product..."
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-400">Loading suppliers...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">No suppliers found</div>
        ) : (
          filteredSuppliers.map((supplier) => (
            <motion.div
              key={supplier.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedSupplier(supplier);
                setShowDetailModal(true);
              }}
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-50 rounded-lg">
                      <FaTruck className="text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{supplier.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <FaUser className="text-xs" />
                        {supplier.contact_name}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${getStatusColor(supplier.status)}`}>
                    {getStatusIcon(supplier.status)}
                    {supplier.status.charAt(0).toUpperCase() + supplier.status.slice(1)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <FaPhone className="text-xs" />
                    <span className="truncate">{supplier.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <FaEnvelope className="text-xs" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 col-span-2">
                    <FaMapMarkerAlt className="text-xs" />
                    <span className="truncate">{supplier.city}, {supplier.country}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Products</span>
                    <span className="font-medium text-gray-800">{supplier.products?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-500">Total Purchases</span>
                    <span className="font-semibold text-primary-600">{formatCurrency(supplier.total_purchases)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Supplier Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-primary">Supplier Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                    placeholder="Enter supplier name"
                    required
                  />
                </div>
                <div>
                  <label className="label-primary">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                    placeholder="Enter contact name"
                  />
                </div>
                <div>
                  <label className="label-primary">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                    placeholder="supplier@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="label-primary">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                    placeholder="+254 712 345 678"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label-primary">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="label-primary">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="label-primary">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                    placeholder="Country"
                  />
                </div>
                <div>
                  <label className="label-primary">Tax ID</label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                    placeholder="Tax/VAT number"
                  />
                </div>
                <div>
                  <label className="label-primary">Payment Terms (days)</label>
                  <select
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                  >
                    <option value="0">Due on receipt</option>
                    <option value="15">Net 15</option>
                    <option value="30">Net 30</option>
                    <option value="45">Net 45</option>
                    <option value="60">Net 60</option>
                  </select>
                </div>
                <div>
                  <label className="label-primary">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label-primary">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                    rows="2"
                    placeholder="Additional notes about this supplier"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 py-3">
                  {editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary px-6 py-3">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Supplier Detail Modal */}
      {showDetailModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Supplier Details</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingSupplier(selectedSupplier);
                    setFormData({
                      name: selectedSupplier.name,
                      contact_name: selectedSupplier.contact_name,
                      email: selectedSupplier.email,
                      phone: selectedSupplier.phone,
                      address: selectedSupplier.address,
                      city: selectedSupplier.city,
                      country: selectedSupplier.country,
                      tax_id: selectedSupplier.tax_id,
                      payment_terms: selectedSupplier.payment_terms,
                      status: selectedSupplier.status,
                      notes: selectedSupplier.notes,
                      products: selectedSupplier.products || [],
                    });
                    setShowDetailModal(false);
                    setShowModal(true);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <FaEdit />
                </button>
                <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Supplier Name</p>
                <p className="font-semibold text-gray-800">{selectedSupplier.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact Person</p>
                <p className="font-semibold text-gray-800">{selectedSupplier.contact_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-semibold text-gray-800">{selectedSupplier.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-semibold text-gray-800">{selectedSupplier.phone}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-semibold text-gray-800">{selectedSupplier.address}, {selectedSupplier.city}, {selectedSupplier.country}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tax ID</p>
                <p className="font-semibold text-gray-800">{selectedSupplier.tax_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Terms</p>
                <p className="font-semibold text-gray-800">Net {selectedSupplier.payment_terms}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedSupplier.status)}`}>
                  {selectedSupplier.status.charAt(0).toUpperCase() + selectedSupplier.status.slice(1)}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Purchases</p>
                <p className="font-semibold text-primary-600">{formatCurrency(selectedSupplier.total_purchases)}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Products Supplied</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedSupplier.products?.map((product, index) => (
                    <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-lg text-sm">
                      {product}
                    </span>
                  ))}
                </div>
              </div>
              {selectedSupplier.notes && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="font-semibold text-gray-800">{selectedSupplier.notes}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;