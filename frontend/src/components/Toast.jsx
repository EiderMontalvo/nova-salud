import { useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, TriangleAlert, X } from 'lucide-react';

const ICONOS = { error: CircleAlert, success: CircleCheck, warn: TriangleAlert };

// Los errores y los avisos con «Deshacer» quedan más tiempo para dar margen a leerlos o actuar.
function duracion(tipo, accion) {
  if (tipo === 'error') return 8000;
  return accion ? 6000 : 4000;
}

export default function Toast({ tipo = 'success', texto, accion, onCerrar }) {
  const Icono = ICONOS[tipo];
  const [pausado, setPausado] = useState(false);

  // onCerrar cambia en cada render del proveedor; la ref evita reiniciar el temporizador.
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;
  const restante = useRef(duracion(tipo, accion));

  // El tiempo se detiene mientras el puntero o el foco están sobre el aviso, para no cerrarlo bajo la mano.
  useEffect(() => {
    if (pausado) return;
    const inicio = Date.now();
    const t = setTimeout(() => cerrarRef.current(), restante.current);
    return () => {
      clearTimeout(t);
      restante.current -= Date.now() - inicio;
    };
  }, [pausado]);

  const usarAccion = () => {
    accion.onClick();
    onCerrar();
  };

  return (
    <div
      className={`toast toast-${tipo}`}
      role={tipo === 'error' ? 'alert' : undefined}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setPausado(false)}
    >
      <Icono size={16} className="toast-icono" aria-hidden="true" />
      <p className="toast-texto">{texto}</p>
      {accion && (
        <button type="button" className="toast-accion" onClick={usarAccion}>
          {accion.texto}
        </button>
      )}
      <button type="button" className="toast-cerrar" onClick={onCerrar} aria-label="Cerrar aviso">
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
