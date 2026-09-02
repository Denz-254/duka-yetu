import { useEffect, useState } from 'react';
import { FaClock, FaUser } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { shifts } from '../api/endpoints';
import useAuthStore from '../store/authStore';
import ShiftClock from '../components/shifts/ShiftClock';
import { formatCurrency, formatDate, formatDuration } from '../utils/helpers';

const ShiftsPage = () => {
  const user = useAuthStore((state) => state.user);
  const isOwner = user?.role === 'OWNER';
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await shifts.list(filter ? { status: filter } : {});
      setRows(data || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaClock className="text-primary-600" /> Cashier shifts
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Clock-in time, opening cash, clock-out time, and money made for each shift.
        </p>
      </div>

      {!isOwner && <ShiftClock onChange={load} />}

      <div className="flex flex-wrap gap-2">
        {['', 'OPEN', 'CLOSED'].map((status) => (
          <button
            key={status || 'ALL'}
            type="button"
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              filter === status ? 'bg-primary-600 text-white' : 'bg-white border text-gray-600'
            }`}
          >
            {status || 'ALL'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Cashier</th>
                <th className="px-4 py-3">Clock in</th>
                <th className="px-4 py-3">Opening</th>
                <th className="px-4 py-3">Clock out</th>
                <th className="px-4 py-3">Closing</th>
                <th className="px-4 py-3">Sales made</th>
                <th className="px-4 py-3">Variance</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="px-4 py-10 text-center text-gray-400">Loading shifts...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="8" className="px-4 py-10 text-center text-gray-400">No shifts yet</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 flex items-center gap-2"><FaUser className="text-gray-400" /> {row.cashier_name}</p>
                      <p className="text-xs text-gray-400">{formatDuration(row.duration_minutes)}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(row.opened_at)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{formatCurrency(row.opening_cash)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.closed_at ? formatDate(row.closed_at) : 'Still open'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {row.closing_cash != null ? formatCurrency(row.closing_cash) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-primary-700">{formatCurrency(row.total_sales)}</p>
                      <p className="text-xs text-gray-400">
                        Cash {formatCurrency(row.cash_sales)} · M-Pesa {formatCurrency(row.mpesa_sales)}
                      </p>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${
                      row.variance == null ? 'text-gray-400' : Number(row.variance) === 0 ? 'text-emerald-600' : Number(row.variance) < 0 ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {row.variance == null ? '—' : formatCurrency(row.variance)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        row.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {row.status}
                      </span>
                      {row.notes && <p className="text-xs text-gray-400 mt-1 max-w-[180px] truncate">{row.notes}</p>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3 p-3">
          {loading ? (
            <div className="px-4 py-10 text-center text-gray-400">Loading shifts...</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-10 text-center text-gray-400">No shifts yet</div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                      <FaUser className="text-xs" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-800">{row.cashier_name}</p>
                      <p className="text-xs text-gray-500">{formatDuration(row.duration_minutes)}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${
                    row.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {row.status}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Clock in</p>
                    <p className="font-medium text-gray-800">{formatDate(row.opened_at)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Opening</p>
                    <p className="font-medium text-gray-800">{formatCurrency(row.opening_cash)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Clock out</p>
                    <p className="font-medium text-gray-800">{row.closed_at ? formatDate(row.closed_at) : 'Still open'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Closing</p>
                    <p className="font-medium text-gray-800">{row.closing_cash != null ? formatCurrency(row.closing_cash) : '—'}</p>
                  </div>
                </div>

                <div className="mt-3 border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Sales</span>
                    <span className="font-bold text-primary-700">{formatCurrency(row.total_sales)}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Cash {formatCurrency(row.cash_sales)} · M-Pesa {formatCurrency(row.mpesa_sales)}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Variance</span>
                    <span className={`font-semibold ${
                      row.variance == null ? 'text-gray-400' : Number(row.variance) === 0 ? 'text-emerald-600' : Number(row.variance) < 0 ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {row.variance == null ? '—' : formatCurrency(row.variance)}
                    </span>
                  </div>
                  {row.notes && <p className="mt-2 text-xs text-gray-400">{row.notes}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ShiftsPage;
