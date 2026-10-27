import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2, Undo2 } from 'lucide-react';

const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

// actual: URL guardada; archivo: imagen nueva elegida; quitar: borrar la actual al guardar.
export default function ImageDrop({ actual, archivo, quitar, onArchivo, onQuitar, onError }) {
  const input = useRef(null);
  const [encima, setEncima] = useState(false);
  const [vista, setVista] = useState(null);

  useEffect(() => {
    if (!archivo) {
      setVista(null);
      return;
    }
    const url = URL.createObjectURL(archivo);
    setVista(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const elegir = (file) => {
    if (!file) return;
    if (!TIPOS.includes(file.type)) return onError('La imagen debe ser JPEG, PNG o WebP.');
    if (file.size > MAX_BYTES) return onError('La imagen pesa más de 5 MB.');
    onError('');
    onArchivo(file);
  };

  const mostrada = vista || (!quitar && actual) || null;

  return (
    <div
      className={encima ? 'dropzone is-over' : 'dropzone'}
      onDragOver={(e) => {
        e.preventDefault();
        setEncima(true);
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => {
        e.preventDefault();
        setEncima(false);
        elegir(e.dataTransfer.files[0]);
      }}
    >
      <div className="dropzone-preview">
        {mostrada ? <img src={mostrada} alt="Vista previa" /> : <ImagePlus size={28} />}
      </div>
      <div className="dropzone-text">
        <strong>{archivo ? archivo.name : mostrada ? 'Imagen actual' : 'Sin imagen'}</strong>
        <span className="muted small">Arrastra una foto aquí o elígela. JPEG, PNG o WebP, hasta 5 MB.</span>
        <div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => input.current?.click()}>
            <ImagePlus size={14} /> {mostrada ? 'Cambiar' : 'Elegir foto'}
          </button>
          {archivo && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onArchivo(null)}>
              <Undo2 size={14} /> Descartar
            </button>
          )}
          {!archivo && actual && !quitar && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onQuitar(true)}>
              <Trash2 size={14} /> Quitar
            </button>
          )}
          {!archivo && quitar && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onQuitar(false)}>
              <Undo2 size={14} /> Conservar imagen
            </button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept={TIPOS.join(',')}
        hidden
        onChange={(e) => {
          elegir(e.target.files[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
