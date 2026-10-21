import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CircleCheck, X } from 'lucide-react'

// small "it worked" messages in the corner (docs/UI_RESEARCH.md section F)
// NN/G: toasts are right for passive success messages, but wrong for errors,
// so errors stay inline next to the field and only successes come here.
//
// usage: const toast = useToast(); toast('Order #12 confirmed')
//        toast('Supplier deactivated', { action: { label: 'Undo', onClick: undo } })
// plain toasts disappear after 5 seconds, toasts with a button stay until closed,
// so nobody loses the chance to press Undo while reading

const ToastContext = createContext(() => {});
const AUTO_HIDE_MS = 5000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, { action } = {}) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, message, action }]);
      if (!action) setTimeout(() => dismiss(id), AUTO_HIDE_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* the live region is always on the page, so screen readers announce new toasts */}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <CircleCheck size={18} aria-hidden="true" className="toast-icon" />
            <span className="toast-text">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  t.action.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss message">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
