import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FaReceipt, FaPrint, FaFilePdf, FaEnvelope, 
  FaWhatsapp, FaSms, FaToggleOn, FaToggleOff,
  FaSave, FaEdit, FaTimes, FaPlus, FaTrash,
  FaInfoCircle, FaCheckCircle
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { business } from '../api/endpoints';

const ReceiptSettingsPage = () => {
  const [settings, setSettings] = useState({
    // General Receipt Settings
    receipt_format: 'standard', // standard, compact, detailed
    receipt_footer: 'Thank you for your business! Visit us again.',
    receipt_header: 'Duka Yetu Store',
    receipt_logo: '',
    show_cashier_name: true,
    show_business_address: true,
    show_phone: true,
    show_email: true,
    show_tax: true,
    
    // Delivery Methods
    print_enabled: true,
    pdf_enabled: true,
    email_enabled: false,
    whatsapp_enabled: false,
    sms_enabled: false,
    
    // Email Settings
    email_subject: 'Your Duka Yetu Receipt',
    email_body: 'Thank you for your purchase. Please find your receipt attached.',
    email_from: 'receipts@dukayetu.com',
    
    // WhatsApp Settings
    whatsapp_template: 'Hello {customer_name}, here is your receipt from {business_name}. Total: {total_amount}. Thank you!',
    
    // SMS Settings
    sms_template: 'Thank you for your purchase! Your receipt number is {receipt_number}. Total: {total_amount}',
    sms_sender_id: 'DukaYetu',
    
    // Receipt Templates
    templates: [
      {
        id: 1,
        name: 'Standard Receipt',
        type: 'standard',
        is_default: true,
        content: 'Business Name\nPhone: {phone}\nEmail: {email}\n---\nItems:\n{item_list}\n---\nTotal: {total_amount}\nPayment: {payment_method}\n---\nThank you!',
      },
      {
        id: 2,
        name: 'Detailed Receipt',
        type: 'detailed',
        is_default: false,
        content: 'BUSINESS NAME\nAddress: {address}\nPhone: {phone}\nEmail: {email}\nTax ID: {tax_id}\n---\nReceipt #: {receipt_number}\nDate: {date}\nCashier: {cashier}\n---\nItems:\n{item_list}\n---\nSubtotal: {subtotal}\nTax: {tax}\nTotal: {total_amount}\nPayment: {payment_method}\n---\nThank you for your business!',
      },
    ],
  });

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    type: 'standard',
    content: '',
    is_default: false,
  });

  useEffect(() => {
    business.getSettings('receipt')
      .then(({ data }) => setSettings((current) => ({ ...current, ...data })))
      .catch(() => toast.error('Failed to load receipt settings'));
  }, []);

  const handleToggle = (key) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await business.updateSettings('receipt', settings);
      toast.success('Receipt settings saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save receipt settings');
    }
  };

  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    const nextTemplate = { ...templateForm, id: editingTemplate?.id || crypto.randomUUID() };
    let templates = editingTemplate
      ? settings.templates.map((template) => template.id === editingTemplate.id ? nextTemplate : template)
      : [...settings.templates, nextTemplate];
    if (nextTemplate.is_default) {
      templates = templates.map((template) => ({ ...template, is_default: template.id === nextTemplate.id }));
    }
    const updated = { ...settings, templates };
    setSettings(updated);
    await business.updateSettings('receipt', updated);
    toast.success(`Template ${editingTemplate ? 'updated' : 'created'} successfully`);
    setShowTemplateModal(false);
    setEditingTemplate(null);
    setTemplateForm({ name: '', type: 'standard', content: '', is_default: false });
  };

  const handleDeleteTemplate = async (id) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      const updated = { ...settings, templates: settings.templates.filter((template) => template.id !== id) };
      setSettings(updated);
      await business.updateSettings('receipt', updated);
      toast.success('Template deleted successfully');
    }
  };

  const formatTypes = [
    { value: 'standard', label: 'Standard' },
    { value: 'compact', label: 'Compact' },
    { value: 'detailed', label: 'Detailed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaReceipt className="text-primary-600" />
          Receipt Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">Configure how your receipts look and where they are sent</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* General Receipt Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">General Receipt Settings</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-primary">Receipt Format</label>
                <select
                  value={settings.receipt_format}
                  onChange={(e) => setSettings({ ...settings, receipt_format: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                >
                  {formatTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-primary">Receipt Header</label>
                <input
                  type="text"
                  value={settings.receipt_header}
                  onChange={(e) => setSettings({ ...settings, receipt_header: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                  placeholder="Business name on receipt"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label-primary">Receipt Footer</label>
                <input
                  type="text"
                  value={settings.receipt_footer}
                  onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                  placeholder="Thank you message on receipt"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Show Cashier</span>
                <button
                  type="button"
                  onClick={() => handleToggle('show_cashier_name')}
                  className="text-2xl"
                >
                  {settings.show_cashier_name ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Show Address</span>
                <button
                  type="button"
                  onClick={() => handleToggle('show_business_address')}
                  className="text-2xl"
                >
                  {settings.show_business_address ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Show Phone</span>
                <button
                  type="button"
                  onClick={() => handleToggle('show_phone')}
                  className="text-2xl"
                >
                  {settings.show_phone ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Show Email</span>
                <button
                  type="button"
                  onClick={() => handleToggle('show_email')}
                  className="text-2xl"
                >
                  {settings.show_email ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button type="submit" className="btn-primary flex items-center gap-2">
                <FaSave /> Save General Settings
              </button>
            </div>
          </form>
        </div>

        {/* Delivery Methods */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Receipt Delivery Methods</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
              <div className="flex items-center gap-3">
                <FaPrint className="text-blue-600 text-xl" />
                <div>
                  <p className="font-medium text-gray-800">Print</p>
                  <p className="text-sm text-gray-500">Physical print receipts</p>
                </div>
              </div>
              <button type="button" onClick={() => handleToggle('print_enabled')} className="text-2xl">
                {settings.print_enabled ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
              <div className="flex items-center gap-3">
                <FaFilePdf className="text-red-600 text-xl" />
                <div>
                  <p className="font-medium text-gray-800">PDF</p>
                  <p className="text-sm text-gray-500">Download as PDF</p>
                </div>
              </div>
              <button type="button" onClick={() => handleToggle('pdf_enabled')} className="text-2xl">
                {settings.pdf_enabled ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
              <div className="flex items-center gap-3">
                <FaEnvelope className="text-green-600 text-xl" />
                <div>
                  <p className="font-medium text-gray-800">Email</p>
                  <p className="text-sm text-gray-500">Send via email</p>
                </div>
              </div>
              <button type="button" onClick={() => handleToggle('email_enabled')} className="text-2xl">
                {settings.email_enabled ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
              <div className="flex items-center gap-3">
                <FaWhatsapp className="text-green-600 text-xl" />
                <div>
                  <p className="font-medium text-gray-800">WhatsApp</p>
                  <p className="text-sm text-gray-500">Send via WhatsApp</p>
                </div>
              </div>
              <button type="button" onClick={() => handleToggle('whatsapp_enabled')} className="text-2xl">
                {settings.whatsapp_enabled ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
              </button>
            </div>
          </div>
        </div>

        {/* Email Settings */}
        {settings.email_enabled && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Email Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-primary">From Email</label>
                <input
                  type="email"
                  value={settings.email_from}
                  onChange={(e) => setSettings({ ...settings, email_from: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                  placeholder="receipts@dukayetu.com"
                />
              </div>
              <div>
                <label className="label-primary">Email Subject</label>
                <input
                  type="text"
                  value={settings.email_subject}
                  onChange={(e) => setSettings({ ...settings, email_subject: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                  placeholder="Your Duka Yetu Receipt"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label-primary">Email Body</label>
                <textarea
                  value={settings.email_body}
                  onChange={(e) => setSettings({ ...settings, email_body: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                  rows="2"
                  placeholder="Thank you for your purchase. Please find your receipt attached."
                />
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Settings */}
        {settings.whatsapp_enabled && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">WhatsApp Settings</h3>
            <div>
              <label className="label-primary">WhatsApp Template</label>
              <textarea
                value={settings.whatsapp_template}
                onChange={(e) => setSettings({ ...settings, whatsapp_template: e.target.value })}
                className="input-primary bg-white text-gray-800"
                rows="3"
                placeholder="Hello {customer_name}, here is your receipt from {business_name}. Total: {total_amount}. Thank you!"
              />
              <p className="text-xs text-gray-400 mt-1">
                Available variables: &#123;customer_name&#125;, &#123;business_name&#125;, &#123;receipt_number&#125;, &#123;total_amount&#125;, &#123;date&#125;
              </p>
            </div>
          </div>
        )}

        {/* SMS Settings */}
        {settings.sms_enabled && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">SMS Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-primary">Sender ID</label>
                <input
                  type="text"
                  value={settings.sms_sender_id}
                  onChange={(e) => setSettings({ ...settings, sms_sender_id: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                  placeholder="DukaYetu"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label-primary">SMS Template</label>
                <textarea
                  value={settings.sms_template}
                  onChange={(e) => setSettings({ ...settings, sms_template: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                  rows="2"
                  placeholder="Thank you for your purchase! Your receipt number is {receipt_number}. Total: {total_amount}"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Available variables: &#123;receipt_number&#125;, &#123;total_amount&#125;, &#123;date&#125;
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Templates */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Receipt Templates</h3>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setTemplateForm({ name: '', type: 'standard', content: '', is_default: false });
                setShowTemplateModal(true);
              }}
              className="btn-primary flex items-center gap-2 text-sm py-2"
            >
              <FaPlus /> New Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settings.templates.map((template) => (
              <div key={template.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-800">{template.name}</h4>
                      {template.is_default && (
                        <span className="text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{template.type}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingTemplate(template);
                        setTemplateForm({
                          name: template.name,
                          type: template.type,
                          content: template.content,
                          is_default: template.is_default,
                        });
                        setShowTemplateModal(true);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-500 rounded transition-colors"
                    >
                      <FaEdit />
                    </button>
                    {!template.is_default && (
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400 bg-gray-50 p-2 rounded-lg">
                  <p className="truncate">{template.content.substring(0, 100)}...</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Template Form Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {editingTemplate ? 'Edit Template' : 'New Receipt Template'}
              </h2>
              <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleTemplateSubmit} className="space-y-4">
              <div>
                <label className="label-primary">Template Name</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                  placeholder="e.g., Standard Receipt"
                  required
                />
              </div>

              <div>
                <label className="label-primary">Template Type</label>
                <select
                  value={templateForm.type}
                  onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                >
                  {formatTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-primary">Template Content</label>
                <textarea
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                  rows="6"
                  placeholder="Business Name\nPhone: {phone}\nEmail: {email}\n---\nItems:\n{item_list}\n---\nTotal: {total_amount}\nPayment: {payment_method}\n---\nThank you!"
                  required
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs text-gray-400">Available variables:</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">&#123;business_name&#125;</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">&#123;phone&#125;</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">&#123;email&#125;</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">&#123;address&#125;</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">&#123;receipt_number&#125;</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">&#123;date&#125;</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">&#123;cashier&#125;</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">&#123;item_list&#125;</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">&#123;total_amount&#125;</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">&#123;payment_method&#125;</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={templateForm.is_default}
                  onChange={(e) => setTemplateForm({ ...templateForm, is_default: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="is_default" className="text-sm text-gray-700">Set as default template</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 py-3">
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
                <button type="button" onClick={() => setShowTemplateModal(false)} className="btn-secondary px-6 py-3">
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

export default ReceiptSettingsPage;