import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FaClipboardList, FaPlus, FaEdit, FaTrash, FaSave,
  FaPercent, FaToggleOn, FaToggleOff, FaInfoCircle,
  FaCheckCircle, FaTimes, FaCalendarAlt, FaCalculator
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { business } from '../api/endpoints';

const TaxSettingsPage = () => {
  const [settings, setSettings] = useState({
    // General Tax Settings
    tax_enabled: true,
    tax_inclusive: false, // true = prices include tax, false = tax added at checkout
    tax_calculation_method: 'line', // line, total
    tax_rounding: 'nearest', // nearest, up, down
    
    // Tax Rates
    tax_rates: [
      {
        id: 1,
        name: 'Standard VAT',
        rate: 16,
        type: 'vat',
        status: 'active',
        description: 'Standard VAT rate for most goods',
        applies_to: 'all',
        effective_from: '2024-01-01',
        effective_to: null,
      },
      {
        id: 2,
        name: 'Reduced VAT',
        rate: 8,
        type: 'vat',
        status: 'active',
        description: 'Reduced VAT rate for essential goods',
        applies_to: 'all',
        effective_from: '2024-01-01',
        effective_to: null,
      },
      {
        id: 3,
        name: 'Zero VAT',
        rate: 0,
        type: 'vat',
        status: 'active',
        description: 'Zero VAT for exempt items',
        applies_to: 'all',
        effective_from: '2024-01-01',
        effective_to: null,
      },
    ],
    
    // Tax Rules - which products get which tax
    tax_rules: [
      {
        id: 1,
        name: 'Default',
        tax_rate_id: 1,
        applies_to: 'all',
        status: 'active',
      },
    ],
    
    // Tax Exemptions
    exemptions: [
      {
        id: 1,
        name: 'Essential Items Exemption',
        description: 'Basic food items are tax exempt',
        applies_to: 'category',
        category_id: null,
        status: 'active',
        reason: 'Government food exemption',
      },
    ],
  });

  const [showTaxRateModal, setShowTaxRateModal] = useState(false);
  const [editingTaxRate, setEditingTaxRate] = useState(null);
  const [showTaxRuleModal, setShowTaxRuleModal] = useState(false);
  const [editingTaxRule, setEditingTaxRule] = useState(null);
  const [showExemptionModal, setShowExemptionModal] = useState(false);
  const [editingExemption, setEditingExemption] = useState(null);
  
  const [taxRateForm, setTaxRateForm] = useState({
    name: '',
    rate: 0,
    type: 'vat',
    status: 'active',
    description: '',
    applies_to: 'all',
    effective_from: '',
    effective_to: '',
  });

  const [taxRuleForm, setTaxRuleForm] = useState({
    name: '',
    tax_rate_id: 1,
    applies_to: 'all',
    status: 'active',
  });

  const [exemptionForm, setExemptionForm] = useState({
    name: '',
    description: '',
    applies_to: 'category',
    category_id: null,
    status: 'active',
    reason: '',
  });

  useEffect(() => {
    business.getSettings('tax')
      .then(({ data }) => setSettings((current) => ({ ...current, ...data })))
      .catch(() => toast.error('Failed to load tax settings'));
  }, []);

  const persistSettings = async (updated) => {
    setSettings(updated);
    await business.updateSettings('tax', updated);
  };

  const handleToggle = (key) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await business.updateSettings('tax', settings);
      toast.success('Tax settings saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save tax settings');
    }
  };

  const handleTaxRateSubmit = async (e) => {
    e.preventDefault();
    const record = { ...taxRateForm, id: editingTaxRate?.id || Date.now() };
    const tax_rates = editingTaxRate
      ? settings.tax_rates.map((item) => item.id === editingTaxRate.id ? record : item)
      : [...settings.tax_rates, record];
    await persistSettings({ ...settings, tax_rates });
    toast.success(`Tax rate ${editingTaxRate ? 'updated' : 'added'} successfully`);
    setShowTaxRateModal(false);
    setEditingTaxRate(null);
    setTaxRateForm({
      name: '',
      rate: 0,
      type: 'vat',
      status: 'active',
      description: '',
      applies_to: 'all',
      effective_from: '',
      effective_to: '',
    });
  };

  const handleTaxRuleSubmit = async (e) => {
    e.preventDefault();
    const record = { ...taxRuleForm, id: editingTaxRule?.id || Date.now() };
    const tax_rules = editingTaxRule
      ? settings.tax_rules.map((item) => item.id === editingTaxRule.id ? record : item)
      : [...settings.tax_rules, record];
    await persistSettings({ ...settings, tax_rules });
    toast.success(`Tax rule ${editingTaxRule ? 'updated' : 'added'} successfully`);
    setShowTaxRuleModal(false);
    setEditingTaxRule(null);
    setTaxRuleForm({
      name: '',
      tax_rate_id: 1,
      applies_to: 'all',
      status: 'active',
    });
  };

  const handleExemptionSubmit = async (e) => {
    e.preventDefault();
    const record = { ...exemptionForm, id: editingExemption?.id || Date.now() };
    const exemptions = editingExemption
      ? settings.exemptions.map((item) => item.id === editingExemption.id ? record : item)
      : [...settings.exemptions, record];
    await persistSettings({ ...settings, exemptions });
    toast.success(`Exemption ${editingExemption ? 'updated' : 'added'} successfully`);
    setShowExemptionModal(false);
    setEditingExemption(null);
    setExemptionForm({
      name: '',
      description: '',
      applies_to: 'category',
      category_id: null,
      status: 'active',
      reason: '',
    });
  };

  const handleDelete = async (type, id) => {
    if (window.confirm('Are you sure you want to delete this?')) {
      const key = type === 'rate' ? 'tax_rates' : type === 'rule' ? 'tax_rules' : 'exemptions';
      await persistSettings({ ...settings, [key]: settings[key].filter((item) => item.id !== id) });
      toast.success('Deleted successfully');
    }
  };

  const taxTypes = [
    { value: 'vat', label: 'VAT' },
    { value: 'gst', label: 'GST' },
    { value: 'sales_tax', label: 'Sales Tax' },
    { value: 'excise', label: 'Excise Duty' },
  ];

  const appliesTo = [
    { value: 'all', label: 'All Products' },
    { value: 'category', label: 'Specific Category' },
    { value: 'product', label: 'Specific Product' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaClipboardList className="text-primary-600" />
          Tax Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">Configure tax rates, rules, and exemptions</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* General Tax Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">General Tax Settings</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Enable Tax</span>
                <button type="button" onClick={() => handleToggle('tax_enabled')} className="text-2xl">
                  {settings.tax_enabled ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Tax Inclusive</span>
                <button type="button" onClick={() => handleToggle('tax_inclusive')} className="text-2xl">
                  {settings.tax_inclusive ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
                </button>
              </div>
              <div>
                <label className="label-primary">Rounding Method</label>
                <select
                  value={settings.tax_rounding}
                  onChange={(e) => setSettings({ ...settings, tax_rounding: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                >
                  <option value="nearest">Nearest</option>
                  <option value="up">Round Up</option>
                  <option value="down">Round Down</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button type="submit" className="btn-primary flex items-center gap-2">
                <FaSave /> Save Tax Settings
              </button>
            </div>
          </form>
        </div>

        {/* Tax Rates */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Tax Rates</h3>
            <button
              onClick={() => {
                setEditingTaxRate(null);
                setTaxRateForm({
                  name: '',
                  rate: 0,
                  type: 'vat',
                  status: 'active',
                  description: '',
                  applies_to: 'all',
                  effective_from: '',
                  effective_to: '',
                });
                setShowTaxRateModal(true);
              }}
              className="btn-primary flex items-center gap-2 text-sm py-2"
            >
              <FaPlus /> Add Tax Rate
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {settings.tax_rates.map((tax) => (
              <div key={tax.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-800">{tax.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(tax.status)}`}>
                        {tax.status}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-primary-600">{tax.rate}%</p>
                    <p className="text-sm text-gray-500">{tax.type}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingTaxRate(tax);
                        setTaxRateForm({
                          name: tax.name,
                          rate: tax.rate,
                          type: tax.type,
                          status: tax.status,
                          description: tax.description || '',
                          applies_to: tax.applies_to || 'all',
                          effective_from: tax.effective_from || '',
                          effective_to: tax.effective_to || '',
                        });
                        setShowTaxRateModal(true);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-500 rounded transition-colors"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete('rate', tax.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                {tax.description && (
                  <p className="text-xs text-gray-400 mt-1">{tax.description}</p>
                )}
                {tax.effective_from && (
                  <p className="text-xs text-gray-400 mt-1">
                    From: {tax.effective_from} {tax.effective_to && `to: ${tax.effective_to}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tax Rules */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Tax Rules</h3>
            <button
              onClick={() => {
                setEditingTaxRule(null);
                setTaxRuleForm({
                  name: '',
                  tax_rate_id: settings.tax_rates[0]?.id || 1,
                  applies_to: 'all',
                  status: 'active',
                });
                setShowTaxRuleModal(true);
              }}
              className="btn-primary flex items-center gap-2 text-sm py-2"
            >
              <FaPlus /> Add Rule
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Rule Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tax Rate</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Applies To</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {settings.tax_rules.map((rule) => {
                  const taxRate = settings.tax_rates.find(t => t.id === rule.tax_rate_id);
                  return (
                    <tr key={rule.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-gray-800">{rule.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{taxRate?.name || 'Unknown'} ({taxRate?.rate || 0}%)</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{rule.applies_to}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(rule.status)}`}>
                          {rule.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingTaxRule(rule);
                              setTaxRuleForm({
                                name: rule.name,
                                tax_rate_id: rule.tax_rate_id,
                                applies_to: rule.applies_to,
                                status: rule.status,
                              });
                              setShowTaxRuleModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-500 rounded transition-colors"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete('rule', rule.id)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tax Exemptions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Tax Exemptions</h3>
            <button
              onClick={() => {
                setEditingExemption(null);
                setExemptionForm({
                  name: '',
                  description: '',
                  applies_to: 'category',
                  category_id: null,
                  status: 'active',
                  reason: '',
                });
                setShowExemptionModal(true);
              }}
              className="btn-primary flex items-center gap-2 text-sm py-2"
            >
              <FaPlus /> Add Exemption
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settings.exemptions.map((exemption) => (
              <div key={exemption.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-800">{exemption.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(exemption.status)}`}>
                        {exemption.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{exemption.description}</p>
                    <p className="text-xs text-gray-400 mt-1">Applies to: {exemption.applies_to}</p>
                    {exemption.reason && (
                      <p className="text-xs text-gray-400">Reason: {exemption.reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingExemption(exemption);
                        setExemptionForm({
                          name: exemption.name,
                          description: exemption.description || '',
                          applies_to: exemption.applies_to || 'category',
                          category_id: exemption.category_id || null,
                          status: exemption.status,
                          reason: exemption.reason || '',
                        });
                        setShowExemptionModal(true);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-500 rounded transition-colors"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete('exemption', exemption.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tax Rate Modal */}
      {showTaxRateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {editingTaxRate ? 'Edit Tax Rate' : 'Add Tax Rate'}
              </h2>
              <button onClick={() => setShowTaxRateModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleTaxRateSubmit} className="space-y-4">
              <div>
                <label className="label-primary">Rate Name</label>
                <input
                  type="text"
                  value={taxRateForm.name}
                  onChange={(e) => setTaxRateForm({ ...taxRateForm, name: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                  placeholder="e.g., Standard VAT"
                  required
                />
              </div>

              <div>
                <label className="label-primary">Rate (%)</label>
                <input
                  type="number"
                  value={taxRateForm.rate}
                  onChange={(e) => setTaxRateForm({ ...taxRateForm, rate: parseFloat(e.target.value) || 0 })}
                  className="input-primary bg-white text-gray-800"
                  placeholder="16"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="label-primary">Tax Type</label>
                <select
                  value={taxRateForm.type}
                  onChange={(e) => setTaxRateForm({ ...taxRateForm, type: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                >
                  {taxTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-primary">Status</label>
                <select
                  value={taxRateForm.status}
                  onChange={(e) => setTaxRateForm({ ...taxRateForm, status: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="label-primary">Description</label>
                <input
                  type="text"
                  value={taxRateForm.description}
                  onChange={(e) => setTaxRateForm({ ...taxRateForm, description: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                  placeholder="Description of this tax rate"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-primary">Effective From</label>
                  <input
                    type="date"
                    value={taxRateForm.effective_from}
                    onChange={(e) => setTaxRateForm({ ...taxRateForm, effective_from: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="label-primary">Effective To</label>
                  <input
                    type="date"
                    value={taxRateForm.effective_to}
                    onChange={(e) => setTaxRateForm({ ...taxRateForm, effective_to: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 py-3">
                  {editingTaxRate ? 'Update Rate' : 'Add Rate'}
                </button>
                <button type="button" onClick={() => setShowTaxRateModal(false)} className="btn-secondary px-6 py-3">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Tax Rule Modal */}
      {showTaxRuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {editingTaxRule ? 'Edit Tax Rule' : 'Add Tax Rule'}
              </h2>
              <button onClick={() => setShowTaxRuleModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleTaxRuleSubmit} className="space-y-4">
              <div>
                <label className="label-primary">Rule Name</label>
                <input
                  type="text"
                  value={taxRuleForm.name}
                  onChange={(e) => setTaxRuleForm({ ...taxRuleForm, name: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                  placeholder="e.g., Default Rule"
                  required
                />
              </div>

              <div>
                <label className="label-primary">Apply Tax Rate</label>
                <select
                  value={taxRuleForm.tax_rate_id}
                  onChange={(e) => setTaxRuleForm({ ...taxRuleForm, tax_rate_id: parseInt(e.target.value) })}
                  className="input-primary bg-white text-gray-800"
                >
                  {settings.tax_rates.map(rate => (
                    <option key={rate.id} value={rate.id}>{rate.name} ({rate.rate}%)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-primary">Applies To</label>
                <select
                  value={taxRuleForm.applies_to}
                  onChange={(e) => setTaxRuleForm({ ...taxRuleForm, applies_to: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                >
                  {appliesTo.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-primary">Status</label>
                <select
                  value={taxRuleForm.status}
                  onChange={(e) => setTaxRuleForm({ ...taxRuleForm, status: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 py-3">
                  {editingTaxRule ? 'Update Rule' : 'Add Rule'}
                </button>
                <button type="button" onClick={() => setShowTaxRuleModal(false)} className="btn-secondary px-6 py-3">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Exemption Modal */}
      {showExemptionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {editingExemption ? 'Edit Exemption' : 'Add Exemption'}
              </h2>
              <button onClick={() => setShowExemptionModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleExemptionSubmit} className="space-y-4">
              <div>
                <label className="label-primary">Exemption Name</label>
                <input
                  type="text"
                  value={exemptionForm.name}
                  onChange={(e) => setExemptionForm({ ...exemptionForm, name: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                  placeholder="e.g., Food Items Exemption"
                  required
                />
              </div>

              <div>
                <label className="label-primary">Description</label>
                <input
                  type="text"
                  value={exemptionForm.description}
                  onChange={(e) => setExemptionForm({ ...exemptionForm, description: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                  placeholder="Description of this exemption"
                />
              </div>

              <div>
                <label className="label-primary">Applies To</label>
                <select
                  value={exemptionForm.applies_to}
                  onChange={(e) => setExemptionForm({ ...exemptionForm, applies_to: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                >
                  <option value="all">All Products</option>
                  <option value="category">Specific Category</option>
                  <option value="product">Specific Product</option>
                </select>
              </div>

              <div>
                <label className="label-primary">Status</label>
                <select
                  value={exemptionForm.status}
                  onChange={(e) => setExemptionForm({ ...exemptionForm, status: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="label-primary">Reason</label>
                <input
                  type="text"
                  value={exemptionForm.reason}
                  onChange={(e) => setExemptionForm({ ...exemptionForm, reason: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                  placeholder="Reason for this exemption"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 py-3">
                  {editingExemption ? 'Update Exemption' : 'Add Exemption'}
                </button>
                <button type="button" onClick={() => setShowExemptionModal(false)} className="btn-secondary px-6 py-3">
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

export default TaxSettingsPage;