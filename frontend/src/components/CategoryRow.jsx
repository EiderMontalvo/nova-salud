import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductTile from './ProductTile';

export default function CategoryRow({ titulo, productos, onVerTodo }) {
  const pista = useRef(null);
  const [bordes, setBordes] = useState({ inicio: true, fin: true });

  const medir = () => {
    const el = pista.current;
    if (!el) return;
    setBordes({ inicio: el.scrollLeft <= 4, fin: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  };

  useEffect(() => {
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [productos.length]);

  const desplazar = (direccion) => {
    const el = pista.current;
    el?.scrollBy({ left: direccion * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className="row" aria-label={titulo}>
      <header className="row-head">
        <h2 className="row-title">{titulo}</h2>
        <span className="muted small num">{productos.length}</span>
        <button type="button" className="row-all" onClick={onVerTodo}>
          Ver todo <ChevronRight size={14} />
        </button>
        <div className="row-arrows">
          <button type="button" className="icon-btn" onClick={() => desplazar(-1)} disabled={bordes.inicio} aria-label="Anteriores">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="icon-btn" onClick={() => desplazar(1)} disabled={bordes.fin} aria-label="Siguientes">
            <ChevronRight size={16} />
          </button>
        </div>
      </header>
      <div className="row-track" ref={pista} onScroll={medir}>
        {productos.map((p) => (
          <ProductTile key={p.id_producto} producto={p} />
        ))}
      </div>
    </section>
  );
}
