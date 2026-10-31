import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext(null);
const MAXIMO = 3;

// Avisos flotantes en el lateral derecho para confirmar acciones sin mover el contenido de la página.
export function ToastProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const siguienteId = useRef(0);

  const cerrar = useCallback((id) => setAvisos((actuales) => actuales.filter((a) => a.id !== id)), []);

  // aviso: { tipo: 'success' | 'error' | 'warn', texto, accion?: { texto, onClick } }
  const avisar = useCallback((aviso) => {
    const id = ++siguienteId.current;
    setAvisos((actuales) => [...actuales, { ...aviso, id }].slice(-MAXIMO));
  }, []);

  return (
    <ToastContext.Provider value={avisar}>
      {children}
      <div className="toasts" aria-live="polite">
        {avisos.map((aviso) => (
          <Toast key={aviso.id} {...aviso} onCerrar={() => cerrar(aviso.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider');
  return context;
}
