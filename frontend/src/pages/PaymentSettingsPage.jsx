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
  mpesa_shortcode: '174379',
  mpesa_send_money_phone: '',
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
        mpesa_send_money_phone: settings.mpesa_send_money_phone,
        card_processor: settings.card_processor,
        stripe_publishable_key: settings.stripe_publishable_key,
        currency: settings.currency,
        tax_rate: settings.tax_rate,
      };

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaCreditCard className="text-primary-600" />
            Payment Settings
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure payment methods and your business M-Pesa Paybill/Till for STK Push
          </p>
        </div>
        <button
          type="button"
          className="text-xs text-gray-500 underline"
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
                    <p className="text-sm text-gray-500">STK Push mobile money</p>
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
              <h3 className="font-semibold text-gray-800 mb-2">M-Pesa / Daraja Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-primary">Account Type</label>
                  <select value={settings.mpesa_account_type} onChange={(e) => setSettings({ ...settings, mpesa_account_type: e.target.value })} className="input-primary bg-white text-gray-800">
                    <option value="paybill">Paybill</option>
                    <option value="till">Till Number</option>
                    <option value="send_money">Send Money (personal number)</option>
                  </select>
                </div>
                {settings.mpesa_account_type === 'send_money' ? (
                  <div>
                    <label className="label-primary">M-Pesa phone (Send Money)</label>
                    <input
                      type="tel"
                      value={settings.mpesa_send_money_phone}
                      onChange={(e) => setSettings({ ...settings, mpesa_send_money_phone: e.target.value })}
                      className="input-primary bg-white text-gray-800"
                      placeholder="07XXXXXXXX"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      For shops without a till or paybill. POS cashiers confirm after the customer sends money to this number. Online DukaMall checkout still uses the platform STK and pays out to this phone.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="label-primary">{settings.mpesa_account_type === 'till' ? 'Till Number' : 'Paybill Number'}</label>
                    <input type="text" value={settings.mpesa_shortcode} onChange={(e) => setSettings({ ...settings, mpesa_shortcode: e.target.value })} className="input-primary bg-white text-gray-800" required />
                  </div>
                )}
                {settings.mpesa_account_type !== 'send_money' && (
                  <>
                    <div>
                      <label className="label-primary">Consumer Key {settings.mpesa_consumer_key_set ? '(saved)' : ''}</label>
                      <input type="password" value={settings.mpesa_consumer_key} onChange={(e) => setSettings({ ...settings, mpesa_consumer_key: e.target.value })} className="input-primary bg-white text-gray-800" autoComplete="off" />
                    </div>
                    <div>
                      <label className="label-primary">Consumer Secret {settings.mpesa_consumer_secret_set ? '(saved)' : ''}</label>
                      <input type="password" value={settings.mpesa_consumer_secret} onChange={(e) => setSettings({ ...settings, mpesa_consumer_secret: e.target.value })} className="input-primary bg-white text-gray-800" autoComplete="off" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label-primary">Passkey {settings.mpesa_passkey_set ? '(saved)' : ''}</label>
                      <input type="password" value={settings.mpesa_passkey} onChange={(e) => setSettings({ ...settings, mpesa_passkey: e.target.value })} className="input-primary bg-white text-gray-800" autoComplete="off" />
                    </div>
                  </>
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
