import { Trash2, X } from 'lucide-react';

export default function DeleteConfirmDialog({ isOpen, user, title, message, onClose, onConfirm }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-transparent backdrop-blur-xs backdrop-brightness-75 backdrop-saturate-150" />
      <div
        className="relative bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{title || `Delete ${user?.role || 'user'}`}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-sm text-gray-600">
            {message || 'This action cannot be undone.'}
          </div>
        </div>

        <div className="mb-4 text-sm text-gray-700">
          <p>
            Are you sure you want to delete <strong>{user?.name}</strong>?
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {user?.email || user?.parentEmail}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}