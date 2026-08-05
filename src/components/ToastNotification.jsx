import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastNotification = ({ toasts, removeToast }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const type = toast.type || 'info';
        return (
          <div key={toast.id} className={`toast ${type}`}>
            {type === 'success' && <CheckCircle2 size={18} color="var(--success-500)" />}
            {type === 'error' && <AlertCircle size={18} color="var(--danger-500)" />}
            {type === 'info' && <Info size={18} color="var(--primary-500)" />}

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{toast.title}</div>
              {toast.message && (
                <div style={{ fontSize: '0.775rem', opacity: 0.85, marginTop: '2px' }}>
                  {toast.message}
                </div>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--slate-400)',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastNotification;
