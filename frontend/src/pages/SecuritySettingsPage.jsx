import { useEffect, useState } from 'react';
import {
  FaShieldAlt, FaKey, FaSave, FaEye, FaEyeSlash,
  FaToggleOn, FaToggleOff, FaInfoCircle,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import { business } from '../api/endpoints';

const DEFAULTS = {
  require_strong_passwords: true,
  password_expiry_days: 90,
  min_password_length: 8,
  require_special_characters: true,
  require_numbers: true,
  require_uppercase: true,
  require_lowercase: true,
  session_timeout_minutes: 60,
  max_sessions_per_user: 5,
  allow_concurrent_sessions: true,
  auto_logout_idle: true,
  two_factor_enabled: false,
  two_factor_method: 'authenticator',
  max_login_attempts: 5,
  lockout_duration_minutes: 30,
  audit_log_enabled: true,
  audit_log_retention_days: 90,
};

const SecuritySettingsPage = () => {
  const [settings, setSettings] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    business.getSettings('security')
      .then(({ data }) => setSettings((current) => ({ ...current, ...data })))
      .catch(() => toast.error('Load failed'));
  }, []);

  const handleToggle = (key) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await business.updateSettings('security', settings);
      toast.success('Security saved');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < settings.min_password_length) {
      toast.error(`Min ${settings.min_password_length} characters`);
      return;
    }
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Change failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaShieldAlt className="text-primary-600" />
          Security Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          These rules apply to login lockout, password changes, and idle logout
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Change Password</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="label-primary">Current Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-primary bg-white text-gray-800 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            <div>
              <label className="label-primary">New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-primary bg-white text-gray-800"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Min {settings.min_password_length} chars
                {settings.require_uppercase ? ' · Uppercase' : ''}
                {settings.require_lowercase ? ' · Lowercase' : ''}
                {settings.require_numbers ? ' · Numbers' : ''}
                {settings.require_special_characters ? ' · Special' : ''}
              </p>
            </div>
            <div>
              <label className="label-primary">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-primary bg-white text-gray-800"
                required
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary flex items-center gap-2">
                <FaKey /> Change Password
              </button>
            </div>
          </form>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="font-semibold text-gray-800">Password Policy</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-primary">Minimum Password Length</label>
              <input
                type="number"
                value={settings.min_password_length}
                onChange={(e) => setSettings({ ...settings, min_password_length: parseInt(e.target.value, 10) || 8 })}
                className="input-primary bg-white text-gray-800"
                min="6"
                max="32"
              />
            </div>
            <div>
              <label className="label-primary">Password Expiry (days)</label>
              <input
                type="number"
                value={settings.password_expiry_days}
                onChange={(e) => setSettings({ ...settings, password_expiry_days: parseInt(e.target.value, 10) || 90 })}
                className="input-primary bg-white text-gray-800"
                min="30"
                max="365"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['require_uppercase', 'Uppercase'],
              ['require_lowercase', 'Lowercase'],
              ['require_numbers', 'Numbers'],
              ['require_special_characters', 'Special chars'],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">{label}</span>
                <button type="button" onClick={() => handleToggle(key)} className="text-2xl">
                  {settings[key] ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
                </button>
              </div>
            ))}
          </div>

          <h3 className="font-semibold text-gray-800 pt-4 border-t">Session & Login</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label-primary">Session Timeout (minutes)</label>
              <input
                type="number"
                value={settings.session_timeout_minutes}
                onChange={(e) => setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value, 10) || 60 })}
                className="input-primary bg-white text-gray-800"
                min="5"
                max="480"
              />
              <p className="text-xs text-gray-400 mt-1">Auto-logout when idle</p>
            </div>
            <div>
              <label className="label-primary">Max Login Attempts</label>
              <input
                type="number"
                value={settings.max_login_attempts}
                onChange={(e) => setSettings({ ...settings, max_login_attempts: parseInt(e.target.value, 10) || 5 })}
                className="input-primary bg-white text-gray-800"
                min="3"
                max="10"
              />
            </div>
            <div>
              <label className="label-primary">Lockout Duration (minutes)</label>
              <input
                type="number"
                value={settings.lockout_duration_minutes}
                onChange={(e) => setSettings({ ...settings, lockout_duration_minutes: parseInt(e.target.value, 10) || 30 })}
                className="input-primary bg-white text-gray-800"
                min="5"
                max="120"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Auto Logout Idle</span>
              <button type="button" onClick={() => handleToggle('auto_logout_idle')} className="text-2xl">
                {settings.auto_logout_idle ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-primary-50 rounded-lg text-sm text-primary-800">
            <FaInfoCircle className="mt-0.5 shrink-0" />
            <p>
              Saved rules are enforced: password change validation, failed-login lockout,
              and idle session timeout in the dashboard.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <FaSave /> {saving ? 'Saving...' : 'Save Security Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SecuritySettingsPage;
