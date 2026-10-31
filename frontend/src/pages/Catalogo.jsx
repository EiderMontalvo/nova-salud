import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, PackageSearch, Plus, RotateCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCatalogo, filtrarProductos } from '../hooks/useCatalogo';
import CategoryRow from '../components/CategoryRow';
import ProductTile from '../components/ProductTile';
import Notice from '../components/Notice';
import { tieneMouse } from '../lib/dispositivo';
import './Catalogo.css';

function EsqueletoMuro() {
  return (
    <div className="wall" aria-busy="true" aria-label="Cargando catálogo">
      {[0, 1].map((fila) => (
        <div key={fila} className="row">
          <div className="skeleton" style={{ width: 180, height: 24, marginBottom: 14 }} />
          <div className="row-track">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="skeleton tile-skeleton" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Catalogo() {
  const { isAdmin } = useAuth();
  const { productos, categorias, nombreCategoria, cargando, error, recargar } = useCatalogo();
  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState('');

  const hileras = useMemo(
    () =>
      [...categorias]
        .sort((a, b) => a.id_categoria - b.id_categoria)
        .map((c) => ({
          ...c,
          productos: productos
            .filter((p) => p.id_categoria === c.id_categoria)
            .sort((a, b) => a.codigo.localeCompare(b.codigo)),
        }))
        .filter((c) => c.productos.length > 0),
    [categorias, productos]
  );

  const idCategoria = Number(categoriaId) || null;
  const enReticula = Boolean(busqueda.trim() || idCategoria);
  const resultados = useMemo(() => {
    const base = idCategoria ? productos.filter((p) => p.id_categoria === idCategoria) : productos;
    return filtrarProductos(base, busqueda);
  }, [productos, idCategoria, busqueda]);

  const titulo = idCategoria ? nombreCategoria[idCategoria] : 'Resultados';

  return (
    <div className="catalogo">
      <h1 className="sr-only">Catálogo</h1>
      <div className="catalogo-head">
        <div className="search search-lg">
          <Search size={20} />
          <input
            className="input"
            type="search"
            placeholder="Buscar nombre o código (MED001)"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar producto"
            autoFocus={tieneMouse()}
          />
        </div>
        <select
          className="select catalogo-categoria"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          aria-label="Categoría"
        >
          <option value="">Todas las categorías ({productos.length})</option>
          {hileras.map((c) => (
            <option key={c.id_categoria} value={c.id_categoria}>
              {c.nombre} ({c.productos.length})
            </option>
          ))}
        </select>
        {isAdmin && (
          <Link to="/admin/productos?nuevo=1" className="btn btn-primary btn-lg catalogo-nuevo">
            <Plus size={16} /> Nuevo producto
          </Link>
        )}
      </div>

      {error && (
        <div className="stack catalogo-error">
          <Notice>{error}</Notice>
          <div>
            <button type="button" className="btn btn-ghost" onClick={recargar}>
              <RotateCw size={14} /> Reintentar
            </button>
          </div>
        </div>
      )}

      {cargando ? (
        <EsqueletoMuro />
      ) : enReticula ? (
        <section aria-label={titulo}>
          <header className="row-head">
            <h2 className="row-title">{titulo}</h2>
            <span className="muted small num">
              {resultados.length} {resultados.length === 1 ? 'producto' : 'productos'}
            </span>
            {idCategoria && (
              <button type="button" className="link-btn" onClick={() => setCategoriaId('')}>
                Ver todas
              </button>
            )}
          </header>
          {resultados.length === 0 ? (
            <div className="empty">
              <PackageSearch size={32} />
              <strong>No hay productos que coincidan con «{busqueda.trim()}»</strong>
              <span className="small">Prueba con otra parte del nombre o con el código (MED…).</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBusqueda('')}>
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <div className="grid">
              {resultados.map((p) => (
                <ProductTile key={p.id_producto} producto={p} categoria={nombreCategoria[p.id_categoria]} expandible={false} />
              ))}
            </div>
          )}
        </section>
      ) : hileras.length === 0 && !error ? (
        <div className="empty">
          <PackageSearch size={32} />
          <strong>Aún no hay productos activos</strong>
          {isAdmin && (
            <Link to="/admin/productos?nuevo=1" className="btn btn-primary btn-sm">
              <Plus size={14} /> Crear el primero
            </Link>
          )}
        </div>
      ) : (
        <div className="wall">
          {hileras.map((c) => (
            <CategoryRow
              key={c.id_categoria}
              titulo={c.nombre}
              productos={c.productos}
              onVerTodo={() => setCategoriaId(String(c.id_categoria))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
