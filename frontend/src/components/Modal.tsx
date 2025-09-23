import React from 'react';

export default function Modal({
  open, title, children, onClose, onSubmit, submitLabel = 'Save',
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit?: () => void | Promise<void>;
  submitLabel?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl w-full max-w-xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
        </div>
        <div className="space-y-4">{children}</div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-gray-50">Cancel</button>
          {onSubmit && (
            <button onClick={onSubmit} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              {submitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
