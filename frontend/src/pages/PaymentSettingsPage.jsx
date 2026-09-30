import { useEffect, useState } from 'react';
import { FaCreditCard, FaMobileAlt, FaMoneyBillWave, FaPaypal, FaToggleOn, FaToggleOff, FaSave, FaLock } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { business } from '../api/endpoints';
import api from '../api/client';

const defaultSettings = {
  cash_enabled: true,
  mpesa_enabled: true,
  card_enabled: true,
  bank_enabled: false,
  mpesa_account_type: 'paybill',
  mpesa_shortcode: '',
  mpesa_account_number: '',
  mpesa_send_money_phone: '',
  card_processor: 'stripe',
  stripe_publishable_key: '',
  currency: 'KES',
  tax_rate: 16,
};

const unlockKey = 'payment_settings_unlocked';

const PaymentSettingsPage = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(unlockKey) === '1');
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!unlocked) return;
    business.getSettings('payment')
      .then(({ data }) => setSettings((current) => ({ ...current, ...data })))
      .catch(() => toast.error('Failed to load payment settings'));
  }, [unlocked]);

  const unlock = async (e) => {
    e.preventDefault();
    setVerifying(true);
    try {
      await api.post('/auth/verify-password', { password });
      sessionStorage.setItem(unlockKey, '1');
      setUnlocked(true);
      setPassword('');
      toast.success('Unlocked');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Incorrect password');
    } finally {
      setVerifying(false);
    }
  };

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
        mpesa_account_number: settings.mpesa_account_number,
        mpesa_send_money_phone: settings.mpesa_send_money_phone,
        card_processor: settings.card_processor,
        stripe_publishable_key: settings.stripe_publishable_key,
        currency: settings.currency,
        tax_rate: settings.tax_rate,
      };

      const { data } = await business.updateSettings('payment', payload);
      setSettings((current) => ({
        ...current,
        ...data,
      }));
      toast.success('Payment settings saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save payment settings');
    }
  };

  if (!unlocked) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary-50 text-primary-700">
              <FaLock className="text-xl" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Confirm password</h1>
              <p className="text-sm text-gray-500">
                Re-enter your login password to access payment settings
              </p>
            </div>
          </div>
          <form onSubmit={unlock} className="space-y-3">
            <input
              type="password"
              className="input-primary bg-white text-gray-800"
              placeholder="Your account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
            <button type="submit" disabled={verifying} className="btn-primary w-full">
              {verifying ? 'Verifying…' : 'Unlock payment settings'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaCreditCard className="text-primary-600" />
            Payment Settings
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Choose how customers pay you. You do not need a Safaricom Daraja account.
          </p>
        </div>
        <button
          type="button"
          className="text-xs text-gray-500 underline self-start"
          onClick={() => {
            sessionStorage.removeItem(unlockKey);
            setUnlocked(false);
          }}
        >
          Lock again
        </button>
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
                <button type="button" onClick={() => handleToggle('cash_enabled')} className="text-2xl text-gray-400 hover:text-primary-600 transition-colors">
                  {settings.cash_enabled ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff />}
                </button>
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <FaMobileAlt className="text-green-600 text-xl" />
                  <div>
                    <p className="font-medium text-gray-800">M-Pesa</p>
                    <p className="text-sm text-gray-500">Paybill, Till, or Send Money</p>
                  </div>
                </div>
                <button type="button" onClick={() => handleToggle('mpesa_enabled')} className="text-2xl text-gray-400 hover:text-primary-600 transition-colors">
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
                <button type="button" onClick={() => handleToggle('card_enabled')} className="text-2xl text-gray-400 hover:text-primary-600 transition-colors">
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
                <button type="button" onClick={() => handleToggle('bank_enabled')} className="text-2xl text-gray-400 hover:text-primary-600 transition-colors">
                  {settings.bank_enabled ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff />}
                </button>
              </div>
            </div>
          </div>

          {settings.mpesa_enabled && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="font-semibold text-gray-800 mb-2">How customers pay you</h3>
              <p className="text-sm text-gray-500 mb-4">
                Money goes straight to your Paybill, Till, or phone. After the M-Pesa message arrives, mark the sale or order as paid. Daraja keys stay with the platform and are only used for subscriptions and featured products.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-primary">Collection method</label>
                  <select value={settings.mpesa_account_type} onChange={(e) => setSettings({ ...settings, mpesa_account_type: e.target.value })} className="input-primary bg-white text-gray-800">
                    <option value="paybill">Paybill</option>
                    <option value="till">Till number</option>
                    <option value="send_money">Send Money</option>
                  </select>
                </div>
                {settings.mpesa_account_type === 'send_money' ? (
                  <div>
                    <label className="label-primary">M-Pesa phone</label>
                    <input
                      type="tel"
                      value={settings.mpesa_send_money_phone}
                      onChange={(e) => setSettings({ ...settings, mpesa_send_money_phone: e.target.value })}
                      className="input-primary bg-white text-gray-800"
                      placeholder="07XXXXXXXX"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The customer sends money to this number. Wait for the SMS, then mark the payment as paid.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="label-primary">{settings.mpesa_account_type === 'till' ? 'Till number' : 'Paybill number'}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={settings.mpesa_shortcode}
                      onChange={(e) => setSettings({ ...settings, mpesa_shortcode: e.target.value })}
                      className="input-primary bg-white text-gray-800"
                      placeholder={settings.mpesa_account_type === 'till' ? 'e.g. 123456' : 'e.g. 400200'}
                      required
                    />
                  </div>
                )}
                {settings.mpesa_account_type === 'paybill' && (
                  <div className="md:col-span-2">
                    <label className="label-primary">Account number</label>
                    <input
                      type="text"
                      value={settings.mpesa_account_number}
                      onChange={(e) => setSettings({ ...settings, mpesa_account_number: e.target.value })}
                      className="input-primary bg-white text-gray-800"
                      placeholder="Optional. Online orders use the order number if this is empty."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Customers type this as the Paybill account. Leave it empty and online orders will use the order number so you can match the message.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {settings.card_enabled && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="font-semibold text-gray-800 mb-4">Card Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-primary">Card Processor</label>
                  <select value={settings.card_processor} onChange={(e) => setSettings({ ...settings, card_processor: e.target.value })} className="input-primary bg-white text-gray-800">
                    <option value="stripe">Stripe</option>
                    <option value="flutterwave">Flutterwave</option>
                    <option value="paystack">Paystack</option>
                  </select>
                </div>
                <div>
                  <label className="label-primary">Publishable Key</label>
                  <input type="text" value={settings.stripe_publishable_key} onChange={(e) => setSettings({ ...settings, stripe_publishable_key: e.target.value })} className="input-primary bg-white text-gray-800" />
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            <h3 className="font-semibold text-gray-800 mb-4">Tax Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-primary">Currency</label>
                <select value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} className="input-primary bg-white text-gray-800">
                  <option value="KES">KES</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label className="label-primary">Tax Rate (%)</label>
                <input type="number" value={settings.tax_rate} onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) })} className="input-primary bg-white text-gray-800" />
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
