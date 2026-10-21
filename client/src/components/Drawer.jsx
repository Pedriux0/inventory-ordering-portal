import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

// side panel for creating / editing one record (docs/UI_RESEARCH.md section B)
// NN/G: a nonmodal side panel keeps the table visible, so people can look at other
// rows while they edit. On desktop the page shrinks to make room, on phones it is full screen.
//
// - focus moves into the panel when it opens and back to the button that opened it on close
// - Escape closes it
// - put data-autofocus on a field to focus that one instead of the first field
export default function Drawer({ title, onClose, children }) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement;
    document.body.classList.add('drawer-open');

    const panel = panelRef.current;
    const target =
      panel.querySelector('[data-autofocus]') ||
      panel.querySelector('input:not([disabled]), select, textarea') ||
      panel;
    target.focus();

    function handleKey(event) {
      if (event.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.classList.remove('drawer-open');
      document.removeEventListener('keydown', handleKey);
      // give focus back to whatever opened the drawer, if it is still on the page
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  return (
    <aside className="drawer" role="dialog" aria-modal="false" aria-labelledby="drawer-title" ref={panelRef} tabIndex={-1}>
      <header className="drawer-header">
        <h2 id="drawer-title">{title}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close panel">
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      <div className="drawer-body">{children}</div>
    </aside>
  );
}
