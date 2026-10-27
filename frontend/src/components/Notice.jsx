import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';

const ICONOS = { error: CircleAlert, success: CircleCheck, warn: TriangleAlert };

// accion: { texto, onClick } opcional, p. ej. «Deshacer».
export default function Notice({ tipo = 'error', children, accion }) {
  if (!children) return null;
  const Icono = ICONOS[tipo];
  return (
    <div className={`notice notice-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <Icono size={16} />
      <div>{children}</div>
      {accion && (
        <button type="button" className="notice-accion" onClick={accion.onClick}>
          {accion.texto}
        </button>
      )}
    </div>
  );
}
