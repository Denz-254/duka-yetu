import { FaHourglassHalf, FaSignOutAlt, FaStore } from 'react-icons/fa';
import useAuthStore from '../store/authStore';

const PendingApprovalPage = () => {
  const user = useAuthStore((state) => state.user);
  const business = useAuthStore((state) => state.business);
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-amber-100 max-w-lg w-full p-8 text-center">
        <div className="inline-flex p-4 rounded-2xl bg-amber-100 text-amber-600 mb-4">
          <FaHourglassHalf className="text-3xl" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Awaiting Platform Approval</h1>
        <p className="text-gray-600 mt-3">
          Hi {user?.name || 'there'}, your business
          {business?.name ? ` "${business.name}"` : ''} has been registered successfully.
        </p>
        <p className="text-gray-500 text-sm mt-3">
          A Duka Yetu super admin must approve your account before you can use POS, inventory,
          and other paid features. This prevents free abuse via multiple emails.
        </p>
        <div className="mt-6 p-4 rounded-xl bg-gray-50 text-left text-sm text-gray-600">
          <p className="flex items-center gap-2 font-medium text-gray-800">
            <FaStore /> What happens next?
          </p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>We review your registration</li>
            <li>Once approved, log in again to access the full dashboard</li>
            <li>Then configure your M-Pesa Paybill/Till in Payment Settings</li>
          </ul>
        </div>
        <button
          onClick={() => {
            logout();
            window.location.href = '/login';
          }}
          className="btn-primary mt-6 inline-flex items-center gap-2"
        >
          <FaSignOutAlt /> Back to Login
        </button>
      </div>
    </div>
  );
};

export default PendingApprovalPage;
