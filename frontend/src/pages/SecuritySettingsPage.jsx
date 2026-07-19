import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FaShieldAlt, FaLock, FaUnlock, FaKey, FaUserShield,
  FaToggleOn, FaToggleOff, FaSave, FaEye, FaEyeSlash,
  FaCheckCircle, FaTimes, FaMobileAlt, FaEnvelope,
  FaGoogle, FaFacebook, FaGithub, FaPlus, FaTrash,
  FaInfoCircle, FaExclamationTriangle, FaStore
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import { business } from '../api/endpoints';

const SecuritySettingsPage = () => {
  const [settings, setSettings] = useState({
    // Password Settings
    require_strong_passwords: true,
    password_expiry_days: 90,
    min_password_length: 8,
    require_special_characters: true,
    require_numbers: true,
    require_uppercase: true,
    require_lowercase: true,

    // Session Settings
    session_timeout_minutes: 60,
    max_sessions_per_user: 5,
    allow_concurrent_sessions: true,
    auto_logout_idle: true,

    // Two-Factor Authentication
    two_factor_enabled: false,
    two_factor_method: 'authenticator', // authenticator, sms, email

    // Login Attempts
    max_login_attempts: 5,
    lockout_duration_minutes: 30,

    // API Security
    api_rate_limit: 1000,
    api_rate_limit_period: 'hour',
    require_api_key: true,

    // Audit Log
    audit_log_enabled: true,
    audit_log_retention_days: 90,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    business.getSettings('security')
      .then(({ data }) => setSettings((current) => ({ ...current, ...data })))
      .catch(() => toast.error('Failed to load security settings'));
  }, []);

  const recentLogins = [
    { 
      id: 1, 
      date: '2026-07-19 14:30:00', 
      ip: '192.168.1.100', 
      device: 'Chrome on Windows',
      location: 'Nairobi, Kenya',
      status: 'success'
    },
    { 
      id: 2, 
      date: '2026-07-18 09:15:00', 
      ip: '192.168.1.101', 
      device: 'Firefox on Mac',
      location: 'Nairobi, Kenya',
      status: 'success'
    },
    { 
      id: 3, 
      date: '2026-07-17 22:45:00', 
      ip: '10.0.0.5', 
      device: 'Safari on iPhone',
      location: 'Mombasa, Kenya',
      status: 'failed'
    },
  ];

  const connectedApps = [
    { id: 1, name: 'Mobile App', icon: FaMobileAlt, status: 'active', last_used: '2026-07-19' },
    { id: 2, name: 'POS Terminal', icon: FaStore, status: 'active', last_used: '2026-07-19' },
    { id: 3, name: 'API Integration', icon: FaKey, status: 'inactive', last_used: '2026-07-15' },
  ];

  const handleToggle = (key) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await business.updateSettings('security', settings);
      toast.success('Security settings saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save security settings');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < settings.min_password_length) {
      toast.error(`Password must be at least ${settings.min_password_length} characters`);
      return;
    }
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    }
  };

  const handleRevokeApp = (id) => {
    if (window.confirm('Are you sure you want to revoke access for this app?')) {
      toast.success('Access revoked successfully');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaShieldAlt className="text-primary-600" />
          Security Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">Protect your account and business data</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Change Password */}
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
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                placeholder="Enter new password"
                required
              />
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-xs text-gray-400">Password requirements:</span>
                <span className="text-xs text-gray-400">• Min {settings.min_password_length} characters</span>
                {settings.require_uppercase && <span className="text-xs text-gray-400">• Uppercase</span>}
                {settings.require_lowercase && <span className="text-xs text-gray-400">• Lowercase</span>}
                {settings.require_numbers && <span className="text-xs text-gray-400">• Numbers</span>}
                {settings.require_special_characters && <span className="text-xs text-gray-400">• Special characters</span>}
              </div>
            </div>

            <div>
              <label className="label-primary">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-primary bg-white text-gray-800"
                placeholder="Confirm new password"
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

        {/* Security Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Security Policies</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-primary">Minimum Password Length</label>
                <input
                  type="number"
                  value={settings.min_password_length}
                  onChange={(e) => setSettings({ ...settings, min_password_length: parseInt(e.target.value) || 8 })}
                  className="input-primary bg-white text-gray-800"
                  min="8"
                  max="20"
                />
              </div>
              <div>
                <label className="label-primary">Password Expiry (days)</label>
                <input
                  type="number"
                  value={settings.password_expiry_days}
                  onChange={(e) => setSettings({ ...settings, password_expiry_days: parseInt(e.target.value) || 90 })}
                  className="input-primary bg-white text-gray-800"
                  min="30"
                  max="365"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Strong Passwords</span>
                <button type="button" onClick={() => handleToggle('require_strong_passwords')} className="text-2xl">
                  {settings.require_strong_passwords ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Uppercase Required</span>
                <button type="button" onClick={() => handleToggle('require_uppercase')} className="text-2xl">
                  {settings.require_uppercase ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Numbers Required</span>
                <button type="button" onClick={() => handleToggle('require_numbers')} className="text-2xl">
                  {settings.require_numbers ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Special Characters</span>
                <button type="button" onClick={() => handleToggle('require_special_characters')} className="text-2xl">
                  {settings.require_special_characters ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button type="submit" className="btn-primary flex items-center gap-2">
                <FaSave /> Save Security Settings
              </button>
            </div>
          </form>
        </div>

        {/* Session Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Session & Login Security</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label-primary">Session Timeout (minutes)</label>
              <input
                type="number"
                value={settings.session_timeout_minutes}
                onChange={(e) => setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) || 60 })}
                className="input-primary bg-white text-gray-800"
                min="15"
                max="480"
              />
            </div>
            <div>
              <label className="label-primary">Max Login Attempts</label>
              <input
                type="number"
                value={settings.max_login_attempts}
                onChange={(e) => setSettings({ ...settings, max_login_attempts: parseInt(e.target.value) || 5 })}
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
                onChange={(e) => setSettings({ ...settings, lockout_duration_minutes: parseInt(e.target.value) || 30 })}
                className="input-primary bg-white text-gray-800"
                min="10"
                max="120"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Concurrent Sessions</span>
              <button type="button" onClick={() => handleToggle('allow_concurrent_sessions')} className="text-2xl">
                {settings.allow_concurrent_sessions ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Auto Logout Idle</span>
              <button type="button" onClick={() => handleToggle('auto_logout_idle')} className="text-2xl">
                {settings.auto_logout_idle ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Two-Factor Auth</span>
              <button type="button" onClick={() => handleToggle('two_factor_enabled')} className="text-2xl">
                {settings.two_factor_enabled ? <FaToggleOn className="text-primary-600" /> : <FaToggleOff className="text-gray-300" />}
              </button>
            </div>
          </div>
        </div>

        {/* Recent Login Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Recent Login Activity</h3>
            <span className="text-xs text-gray-500">Last 7 days</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date & Time</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">IP Address</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Device</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Location</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLogins.map((login) => (
                  <tr key={login.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-600">{login.date}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{login.ip}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{login.device}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{login.location}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        login.status === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {login.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Connected Apps */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Connected Apps & Devices</h3>
            <button className="text-primary-600 text-sm hover:text-primary-700">Manage All</button>
          </div>
          <div className="space-y-3">
            {connectedApps.map((app) => {
              const Icon = app.icon;
              return (
                <div key={app.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <Icon className="text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{app.name}</p>
                      <p className="text-xs text-gray-400">Last used: {app.last_used}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      app.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {app.status}
                    </span>
                    <button
                      onClick={() => handleRevokeApp(app.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettingsPage;