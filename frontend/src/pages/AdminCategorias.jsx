import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, EyeOff, RotateCcw, Tags } from 'lucide-react';
import { api, cuerpoCategoria, traerTodos } from '../api';
import CategoriaForm from '../components/CategoriaForm';
import { SIN_IMAGEN } from '../components/ProductTile';
import { useToast } from '../context/ToastContext';
import { mensajeError } from '../lib/errores';
import './AdminCategorias.css';

export default function AdminCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [activas, setActivas] = useState(true);
  const [cargando, setCargando] = useState(true);
  const avisar = useToast();
  // undefined: cerrado; null: crear; objeto: editar.
  const [editando, setEditando] = useState(undefined);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setCategorias(await traerTodos(`/categorias?activo=${activas}`));
    } catch (err) {
      avisar({ tipo: 'error', texto: mensajeError(err, 'No se pudieron cargar las categorías.') });
    } finally {
      setCargando(false);
    }
  }, [activas, avisar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    traerTodos('/productos')
      .then(setProductos)
      .catch(() => setProductos([]));
  }, []);

  const conteo = useMemo(() => {
    const mapa = {};
    for (const p of productos) mapa[p.id_categoria] = (mapa[p.id_categoria] || 0) + 1;
    return mapa;
  }, [productos]);

  const alGuardar = (categoria, accion) => {
    setEditando(undefined);
    avisar({ tipo: 'success', texto: `Categoría «${categoria.nombre}» ${accion}.` });
    cargar();
  };

  const cambiarEstado = async (categoria, activa) => {
    try {
      if (activa) {
        await api(`/categorias/${categoria.id_categoria}`, {
          method: 'PUT',
          body: cuerpoCategoria(categoria, { activo: true }),
        });
      } else {
        await api(`/categorias/${categoria.id_categoria}`, { method: 'DELETE' });
      }
      avisar({
        tipo: 'success',
        texto: `Categoría «${categoria.nombre}» ${activa ? 'reactivada' : 'desactivada'}.`,
        accion: { texto: 'Deshacer', onClick: () => cambiarEstado(categoria, !activa) },
      });
      cargar();
    } catch (err) {
      avisar({ tipo: 'error', texto: mensajeError(err, 'No se pudo cambiar el estado.') });
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Categorías</h1>
          <p className="muted">Cada categoría es una hilera del catálogo.</p>
        </div>
        <button type="button" className="btn btn-primary btn-lg" onClick={() => setEditando(null)}>
          <Plus size={16} /> Nueva categoría
        </button>
      </div>

      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Estado">
          <button type="button" aria-pressed={activas} onClick={() => setActivas(true)}>
            Activas
          </button>
          <button type="button" aria-pressed={!activas} onClick={() => setActivas(false)}>
            Inactivas
          </button>
        </div>
      </div>

      {cargando && categorias.length === 0 ? (
        <div className="cat-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: '4 / 3' }} />
          ))}
        </div>
      ) : categorias.length === 0 ? (
        <div className="empty">
          <Tags size={32} />
          <strong>{activas ? 'Aún no hay categorías' : 'No hay categorías desactivadas'}</strong>
        </div>
      ) : (
        <div className="cat-grid">
          {categorias.map((c) => (
            <article key={c.id_categoria} className={c.activo ? 'cat-card' : 'cat-card is-off'}>
              <div className="cat-foto">
                <img src={c.imagen || SIN_IMAGEN} alt="" loading="lazy" />
              </div>
              <div className="cat-cuerpo">
                <div className="cat-titulo">
                  <h2 className="row-title">{c.nombre}</h2>
                  <span className="muted small num">{conteo[c.id_categoria] || 0} productos</span>
                </div>
                {c.descripcion && <p className="muted small">{c.descripcion}</p>}
                <div className="cat-acciones">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditando(c)}>
                    <Pencil size={14} /> Editar
                  </button>
                  {c.activo ? (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => cambiarEstado(c, false)}>
                      <EyeOff size={14} /> Desactivar
                    </button>
                  ) : (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => cambiarEstado(c, true)}>
                      <RotateCcw size={14} /> Reactivar
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {editando !== undefined && (
        <CategoriaForm
          key={editando?.id_categoria ?? 'nueva'}
          categoria={editando}
          onCerrar={() => setEditando(undefined)}
          onGuardado={alGuardar}
        />
      )}
    </div>
  );
}
