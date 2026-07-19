import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaUsers, FaSearch, FaPlus, FaEdit, FaTrash, FaUserPlus,
  FaPhone, FaEnvelope, FaMapMarkerAlt, FaShoppingBag,
  FaStar, FaStarHalf, FaRegStar, FaFilter, FaSort,
  FaChevronLeft, FaChevronRight, FaUserCircle
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { customers as customersApi } from '../api/endpoints';
import { formatCurrency, formatDate } from '../utils/helpers';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', status: 'active', notes: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await customersApi.getAll();
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const openCustomerForm = (customer = null) => {
    setEditingCustomer(customer);
    setFormData(customer ? {
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      status: customer.status || 'active',
      notes: customer.notes || '',
    } : { name: '', email: '', phone: '', address: '', status: 'active', notes: '' });
    setShowFormModal(true);
  };

  const saveCustomer = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (editingCustomer) {
        await customersApi.update(editingCustomer.id, formData);
      } else {
        await customersApi.create(formData);
      }
      toast.success(`Customer ${editingCustomer ? 'updated' : 'created'} successfully`);
      setShowFormModal(false);
      await fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save customer');
      setLoading(false);
    }
  };

  const deleteCustomer = async (customer) => {
    if (!window.confirm(`Delete ${customer.name}?`)) return;
    try {
      await customersApi.delete(customer.id);
      toast.success('Customer deleted successfully');
      setShowModal(false);
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete customer');
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const getCustomerRating = (orders) => {
    if (orders >= 10) return 5;
    if (orders >= 7) return 4;
    if (orders >= 4) return 3;
    if (orders >= 2) return 2;
    return 1;
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => {
      if (i < Math.floor(rating)) return <FaStar key={i} className="text-yellow-400 text-xs" />;
      if (i < rating) return <FaStarHalf key={i} className="text-yellow-400 text-xs" />;
      return <FaRegStar key={i} className="text-gray-300 text-xs" />;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaUsers className="text-primary-600" />
            Customers
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage your customer relationships</p>
        </div>
        <button onClick={() => openCustomerForm()} className="btn-primary flex items-center gap-2">
          <FaUserPlus /> Add Customer
        </button>
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
            placeholder="Search customers by name or email..."
          />
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-400">Loading customers...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">No customers found</div>
        ) : (
          filteredCustomers.map((customer) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedCustomer(customer);
                setShowModal(true);
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-600 font-bold text-lg">
                    {customer.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{customer.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <FaEnvelope className="text-xs" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <FaPhone className="text-xs" />
                    <span>{customer.phone}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Orders</span>
                  <span className="font-semibold text-gray-800">{customer.total_orders}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-500">Total Spent</span>
                  <span className="font-semibold text-primary-600">{formatCurrency(customer.total_spent)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-500">Rating</span>
                  <div className="flex items-center gap-1">
                    {renderStars(getCustomerRating(customer.total_orders))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Customer Detail Modal */}
      {showModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Customer Details</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowModal(false); openCustomerForm(selectedCustomer); }} className="p-2 text-blue-500"><FaEdit /></button>
                <button onClick={() => deleteCustomer(selectedCustomer)} className="p-2 text-red-500"><FaTrash /></button>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-600 font-bold text-2xl">
                  {selectedCustomer.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{selectedCustomer.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FaEnvelope /> {selectedCustomer.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FaPhone /> {selectedCustomer.phone}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary-600">{selectedCustomer.total_orders}</p>
                <p className="text-xs text-gray-500">Total Orders</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary-600">{formatCurrency(selectedCustomer.total_spent)}</p>
                <p className="text-xs text-gray-500">Total Spent</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary-600">{formatDate(selectedCustomer.last_order)}</p>
                <p className="text-xs text-gray-500">Last Order</p>
              </div>
            </div>

            <h4 className="font-semibold text-gray-800 mb-3">Order History</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedCustomer.orders?.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{order.receipt_number || `#${order.id.slice(0, 8)}`}</p>
                    <p className="text-xs text-gray-500">{formatDate(order.sale_date)}</p>
                  </div>
                  <p className="font-semibold text-primary-600">{formatCurrency(order.total_amount)}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
              <button onClick={() => setShowFormModal(false)} className="text-gray-400">✕</button>
            </div>
            <form onSubmit={saveCustomer} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['name', 'Name', 'text'],
                ['email', 'Email', 'email'],
                ['phone', 'Phone', 'tel'],
                ['address', 'Address', 'text'],
              ].map(([key, label, type]) => (
                <div key={key} className={key === 'address' ? 'sm:col-span-2' : ''}>
                  <label className="label-primary">{label}</label>
                  <input type={type} value={formData[key]} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} className="input-primary" required={key === 'name'} />
                </div>
              ))}
              <div>
                <label className="label-primary">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input-primary">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label-primary">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input-primary" rows="3" />
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <button disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : 'Save Customer'}</button>
                <button type="button" onClick={() => setShowFormModal(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;