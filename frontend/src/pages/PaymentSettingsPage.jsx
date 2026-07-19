import { useEffect, useState } from 'react';
import { FaCreditCard, FaMobileAlt, FaMoneyBillWave, FaPaypal, FaToggleOn, FaToggleOff, FaSave } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { business } from '../api/endpoints';

const defaultSettings = {
  cash_enabled: true,
  mpesa_enabled: true,
  card_enabled: true,
  bank_enabled: false,
  mpesa_account_type: 'paybill',
  mpesa_shortcode: '174379',
  mpesa_consumer_key: '',
  mpesa_consumer_secret: '',
  mpesa_passkey: '',
  mpesa_consumer_key_set: false,
  mpesa_consumer_secret_set: false,
  mpesa_passkey_set: false,
  card_processor: 'stripe',
  stripe_publishable_key: '',
  currency: 'KES',
  tax_rate: 16,
};

const PaymentSettingsPage = () => {
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    business.getSettings('payment')
      .then(({ data }) => setSettings((current) => ({ ...current, ...data })))
      .catch(() => toast.error('Failed to load payment settings'));
  }, []);

  const handleToggle = (key) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        cash_enabled: settings.cash_enabled,
        mpesa_enabled: settings.mpesa_enabled,
        card_enabled: settings.card_enabled,
        bank_enabled: settings.bank_enabled,
        mpesa_account_type: settings.mpesa_account_type,
        mpesa_shortcode: settings.mpesa_shortcode,
        card_processor: settings.card_processor,
        stripe_publishable_key: settings.stripe_publishable_key,
        currency: settings.currency,
        tax_rate: settings.tax_rate,
      };

      // Only send secrets when the owner typed a new value.
      if (settings.mpesa_consumer_key?.trim()) {
        payload.mpesa_consumer_key = settings.mpesa_consumer_key.trim();
      }
      if (settings.mpesa_consumer_secret?.trim()) {
        payload.mpesa_consumer_secret = settings.mpesa_consumer_secret.trim();
      }
      if (settings.mpesa_passkey?.trim()) {
        payload.mpesa_passkey = settings.mpesa_passkey.trim();
      }

      const { data } = await business.updateSettings('payment', payload);
      setSettings((current) => ({
        ...current,
        ...data,
        mpesa_consumer_key: '',
        mpesa_consumer_secret: '',
        mpesa_passkey: '',
      }));
      toast.success('Payment settings saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save payment settings');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaCreditCard className="text-primary-600" />
          Payment Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Configure payment methods and your business M-Pesa Paybill/Till for STK Push
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">Payment Methods</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <FaMoneyBillWave className="text-green-600 text-xl" />
                  <div>
                    <p className="font-medium text-gray-800">Cash</p>
                    <p className="text-sm text-gray-500">In-store cash payments</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('cash_enabled')}
                  className="text-2xl text-gray-400 hover:text-primary-600 transition-colors"
                >
                  {settings.cash_enabled ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <FaMobileAlt className="text-green-600 text-xl" />
                  <div>
                    <p className="font-medium text-gray-800">M-Pesa</p>
                    <p className="text-sm text-gray-500">STK Push mobile money</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('mpesa_enabled')}
                  className="text-2xl text-gray-400 hover:text-primary-600 transition-colors"
                >
                  {settings.mpesa_enabled ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <FaCreditCard className="text-blue-600 text-xl" />
                  <div>
                    <p className="font-medium text-gray-800">Card Payments</p>
                    <p className="text-sm text-gray-500">Visa, Mastercard, etc.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('card_enabled')}
                  className="text-2xl text-gray-400 hover:text-primary-600 transition-colors"
                >
                  {settings.card_enabled ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <FaPaypal className="text-blue-600 text-xl" />
                  <div>
                    <p className="font-medium text-gray-800">Bank Transfer</p>
                    <p className="text-sm text-gray-500">Direct bank payments</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('bank_enabled')}
                  className="text-2xl text-gray-400 hover:text-primary-600 transition-colors"
                >
                  {settings.bank_enabled ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff />}
                </button>
              </div>
            </div>
          </div>

          {settings.mpesa_enabled && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="font-semibold text-gray-800 mb-2">M-Pesa / Daraja Configuration</h3>
              <p className="text-sm text-gray-500 mb-4">
                Use sandbox credentials while testing. For production, each business connects its own
                Safaricom Daraja app (Paybill or Till) so money settles to that shortcode.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-primary">Account Type</label>
                  <select
                    value={settings.mpesa_account_type}
                    onChange={(e) => setSettings({ ...settings, mpesa_account_type: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                  >
                    <option value="paybill">Paybill</option>
                    <option value="till">Till Number</option>
                  </select>
                </div>
                <div>
                  <label className="label-primary">
                    {settings.mpesa_account_type === 'till' ? 'Till Number' : 'Paybill Number'}
                  </label>
                  <input
                    type="text"
                    value={settings.mpesa_shortcode}
                    onChange={(e) => setSettings({ ...settings, mpesa_shortcode: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                    placeholder={settings.mpesa_account_type === 'till' ? 'e.g. 123456' : 'e.g. 174379'}
                    required
                  />
                </div>
                <div>
                  <label className="label-primary">
                    Consumer Key {settings.mpesa_consumer_key_set ? '(saved)' : ''}
                  </label>
                  <input
                    type="password"
                    value={settings.mpesa_consumer_key}
                    onChange={(e) => setSettings({ ...settings, mpesa_consumer_key: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                    placeholder={settings.mpesa_consumer_key_set ? '•••••••• (leave blank to keep)' : 'Daraja consumer key'}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="label-primary">
                    Consumer Secret {settings.mpesa_consumer_secret_set ? '(saved)' : ''}
                  </label>
                  <input
                    type="password"
                    value={settings.mpesa_consumer_secret}
                    onChange={(e) => setSettings({ ...settings, mpesa_consumer_secret: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                    placeholder={settings.mpesa_consumer_secret_set ? '•••••••• (leave blank to keep)' : 'Daraja consumer secret'}
                    autoComplete="off"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label-primary">
                    Passkey {settings.mpesa_passkey_set ? '(saved)' : ''}
                  </label>
                  <input
                    type="password"
                    value={settings.mpesa_passkey}
                    onChange={(e) => setSettings({ ...settings, mpesa_passkey: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                    placeholder={settings.mpesa_passkey_set ? '•••••••• (leave blank to keep)' : 'Lipa Na M-Pesa Online passkey'}
                    autoComplete="off"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Sandbox shortcode is usually <strong>174379</strong>. Secrets are stored server-side and never shown again.
                If left empty, the platform sandbox keys from backend `.env` are used as a fallback for testing.
              </p>
            </div>
          )}

          {settings.card_enabled && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="font-semibold text-gray-800 mb-4">Card Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-primary">Card Processor</label>
                  <select
                    value={settings.card_processor}
                    onChange={(e) => setSettings({ ...settings, card_processor: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                  >
                    <option value="stripe">Stripe</option>
                    <option value="flutterwave">Flutterwave</option>
                    <option value="paystack">Paystack</option>
                  </select>
                </div>
                <div>
                  <label className="label-primary">Publishable Key</label>
                  <input
                    type="text"
                    value={settings.stripe_publishable_key}
                    onChange={(e) => setSettings({ ...settings, stripe_publishable_key: e.target.value })}
                    className="input-primary bg-white text-gray-800"
                  />
                </div>
                <p className="md:col-span-2 text-xs text-gray-500">
                  Configure Stripe secret keys only in the backend environment; they are never stored in this form.
                </p>
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            <h3 className="font-semibold text-gray-800 mb-4">Tax Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-primary">Currency</label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="input-primary bg-white text-gray-800"
                >
                  <option value="KES">KES</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label className="label-primary">Tax Rate (%)</label>
                <input
                  type="number"
                  value={settings.tax_rate}
                  onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) })}
                  className="input-primary bg-white text-gray-800"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button type="submit" className="btn-primary flex items-center gap-2">
              <FaSave /> Save Payment Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentSettingsPage;
