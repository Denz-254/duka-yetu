import { useEffect, useState } from 'react';
import { FaSignInAlt, FaSignOutAlt, FaClock } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { shifts } from '../../api/endpoints';
import { formatCurrency, formatDate, formatDuration } from '../../utils/helpers';

const ShiftClock = ({ onChange, compact = false, refreshToken = 0 }) => {
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openingCash, setOpeningCash] = useState('0');
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [showClose, setShowClose] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await shifts.current();
      setShift(data || null);
      onChange?.(data || null);
    } catch {
      setShift(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshToken]);

  useEffect(() => {
    if (!shift) return undefined;
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [shift?.id]);

  const clockIn = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await shifts.open(Number(openingCash) || 0);
      setShift(data);
      onChange?.(data);
      toast.success('Clocked in');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Clock in failed');
    } finally {
      setSaving(false);
    }
  };

  const clockOut = async (e) => {
    e.preventDefault();
    if (closingCash === '' || Number.isNaN(Number(closingCash))) {
      toast.error('Enter the cash in the drawer');
      return;
    }
    setSaving(true);
    try {
      const { data } = await shifts.close({
        closing_cash: Number(closingCash),
        notes: notes.trim() || undefined,
      });
      toast.success(`Clocked out · made ${formatCurrency(data.total_sales)}`);
      setShift(null);
      setShowClose(false);
      setClosingCash('');
      setNotes('');
      onChange?.(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Clock out failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-400">Checking shift...</div>;
  }

  if (!shift) {
    return (
      <form onSubmit={clockIn} className={`bg-white rounded-xl border border-gray-100 shadow-sm ${compact ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center gap-2 mb-3">
          <FaSignInAlt className="text-primary-600" />
          <h2 className="font-bold text-gray-800">Clock in</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Enter the cash in the drawer when you start. The owner will see your in-time and opening amount.
        </p>
        <label className="label-primary">Opening cash (KES)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={openingCash}
          onChange={(e) => setOpeningCash(e.target.value)}
          className="input-primary bg-white text-gray-800 mb-3"
          required
        />
        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Starting...' : 'Start shift'}
        </button>
      </form>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-emerald-100 shadow-sm ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Shift open</p>
          <p className="font-bold text-gray-800 mt-1 flex items-center gap-2">
            <FaClock /> In at {formatDate(shift.opened_at)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Started with {formatCurrency(shift.opening_cash)} · {formatDuration(shift.duration_minutes)}
          </p>
        </div>
        <button type="button" onClick={() => setShowClose(true)} className="btn-secondary text-sm">
          <FaSignOutAlt /> Clock out
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Sales made</p>
          <p className="font-bold text-gray-800">{formatCurrency(shift.total_sales)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Cash sales</p>
          <p className="font-bold text-gray-800">{formatCurrency(shift.cash_sales)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">M-Pesa</p>
          <p className="font-bold text-gray-800">{formatCurrency(shift.mpesa_sales)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Expected in drawer</p>
          <p className="font-bold text-emerald-700">{formatCurrency(shift.expected_cash)}</p>
        </div>
      </div>

      {showClose && (
        <form onSubmit={clockOut} className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          <p className="text-sm text-gray-600">
            Count the cash in the drawer. Expected is opening cash plus cash sales
            ({formatCurrency(shift.expected_cash)}).
          </p>
          <div>
            <label className="label-primary">Closing cash (KES)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              className="input-primary bg-white text-gray-800"
              placeholder="Amount in the drawer now"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label-primary">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-primary bg-white text-gray-800"
              rows={2}
              placeholder="Shortages, extra cash, handover notes"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Closing...' : 'End shift'}
            </button>
            <button type="button" onClick={() => setShowClose(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ShiftClock;
