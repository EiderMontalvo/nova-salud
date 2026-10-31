import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Drawer({ abierto, titulo, onCerrar, children, pie, onSubmit }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      className="drawer"
      onCancel={(e) => {
        e.preventDefault();
        onCerrar();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCerrar();
      }}
    >
      {abierto && (
        <form onSubmit={onSubmit} className="drawer-form">
          <div className="drawer-head">
            <h2>{titulo}</h2>
            <button type="button" className="icon-btn" onClick={onCerrar} aria-label="Cerrar">
              <X size={16} />
            </button>
          </div>
          <div className="drawer-body">{children}</div>
          {pie && <div className="drawer-foot">{pie}</div>}
        </form>
      )}
    </dialog>
  );
}
