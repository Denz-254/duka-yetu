/** Reusable screen modal — replaces window.confirm / prompt */
import { FaTimes } from 'react-icons/fa';

export default function Modal({
  open,
  title,
  children,
  onClose,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  danger = false,
  hideActions = false,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-5 border border-gray-100">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <FaTimes />
          </button>
        </div>
        <div className="text-sm text-gray-600 mb-5 space-y-3">{children}</div>
        {!hideActions && (
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">
              {cancelLabel}
            </button>
            {onConfirm && (
              <button
                type="button"
                onClick={onConfirm}
                className={`text-sm px-4 py-2 rounded-lg text-white ${
                  danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {confirmLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
