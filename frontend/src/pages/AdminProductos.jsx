import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Pencil, EyeOff, RotateCcw, PackageSearch, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, cuerpoProducto, traerTodos } from '../api';
import { useDebounce } from '../hooks/useDebounce';
import ProductoForm from '../components/ProductoForm';
import StockEstado from '../components/StockEstado';
import Notice from '../components/Notice';
import { SIN_IMAGEN } from '../components/ProductTile';
import { mensajeError } from '../lib/errores';
import { soles, fecha, estadoVencimiento } from '../lib/formato';

const POR_PAGINA = 20;

export default function AdminProductos() {
  const [params, setParams] = useSearchParams();
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [paginacion, setPaginacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [activos, setActivos] = useState(true);
  const [pagina, setPagina] = useState(1);
  // undefined: cerrado; null: crear; objeto: editar.
  const [editando, setEditando] = useState(undefined);

  const consulta = useDebounce(busqueda.trim());

  // Cualquier filtro nuevo vuelve a la primera página.
  const filtrar = (aplicar) => (valor) => {
    aplicar(valor);
    setPagina(1);
  };

  const nombreCategoria = useMemo(
    () => Object.fromEntries(categorias.map((c) => [c.id_categoria, c.nombre])),
    [categorias]
  );

  useEffect(() => {
    traerTodos('/categorias')
      .then(setCategorias)
      .catch((err) => setAviso({ tipo: 'error', texto: mensajeError(err, 'No se pudieron cargar las categorías.') }));
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    const q = new URLSearchParams({ page: pagina, limit: POR_PAGINA, activo: activos });
    if (consulta) q.set('search', consulta);
    if (categoriaId) q.set('id_categoria', categoriaId);
    try {
      const res = await api(`/productos?${q}`);
      setProductos(res.data);
      setPaginacion(res.pagination);
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err, 'No se pudieron cargar los productos.') });
    } finally {
      setCargando(false);
    }
  }, [pagina, activos, consulta, categoriaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Enlaces desde otras pantallas: ?nuevo=1 o ?editar=<id>.
  useEffect(() => {
    const idEditar = params.get('editar');
    if (params.get('nuevo')) {
      setEditando(null);
    } else if (idEditar) {
      api(`/productos/${idEditar}`)
        .then((res) => setEditando(res.data))
        .catch((err) => setAviso({ tipo: 'error', texto: mensajeError(err, 'Producto no encontrado.') }));
    }
  }, [params]);

  const cerrarFormulario = () => {
    setEditando(undefined);
    if (params.size) setParams({}, { replace: true });
  };

  const alGuardar = (producto, accion) => {
    cerrarFormulario();
    setAviso({ tipo: 'success', texto: `«${producto.nombre}» ${accion}.` });
    cargar();
  };

  const cambiarEstado = async (producto, activo) => {
    setAviso(null);
    try {
      if (activo) {
        await api(`/productos/${producto.id_producto}`, { method: 'PUT', body: cuerpoProducto(producto, { activo: true }) });
      } else {
        await api(`/productos/${producto.id_producto}`, { method: 'DELETE' });
      }
      setAviso({
        tipo: 'success',
        texto: `«${producto.nombre}» ${activo ? 'reactivado' : 'desactivado'}.`,
        deshacer: () => cambiarEstado(producto, !activo),
      });
      cargar();
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err, 'No se pudo cambiar el estado.') });
    }
  };

  const total = paginacion?.total ?? 0;
  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, total);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="muted">Crea, edita y actualiza la foto de cada producto. Desactivar no borra nada.</p>
        </div>
        <button type="button" className="btn btn-primary btn-lg" onClick={() => setEditando(null)}>
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {aviso && (
        <div style={{ marginBottom: '1rem' }}>
          <Notice tipo={aviso.tipo} accion={aviso.deshacer && { texto: 'Deshacer', onClick: aviso.deshacer }}>
            {aviso.texto}
          </Notice>
        </div>
      )}

      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input
            className="input"
            type="search"
            placeholder="Buscar por nombre o código"
            value={busqueda}
            onChange={(e) => filtrar(setBusqueda)(e.target.value)}
            aria-label="Buscar productos"
          />
        </div>
        <select
          className="select"
          value={categoriaId}
          onChange={(e) => filtrar(setCategoriaId)(e.target.value)}
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id_categoria} value={c.id_categoria}>
              {c.nombre}
            </option>
          ))}
        </select>
        <div className="segmented" role="group" aria-label="Estado">
          <button type="button" aria-pressed={activos} onClick={() => filtrar(setActivos)(true)}>
            Activos
          </button>
          <button type="button" aria-pressed={!activos} onClick={() => filtrar(setActivos)(false)}>
            Inactivos
          </button>
        </div>
      </div>

      {cargando && productos.length === 0 ? (
        <div className="skeleton" style={{ height: 420 }} />
      ) : productos.length === 0 ? (
        <div className="empty">
          <PackageSearch size={32} />
          <strong>
            {consulta || categoriaId
              ? 'Ningún producto coincide con los filtros'
              : activos
                ? 'Aún no hay productos activos'
                : 'No hay productos desactivados'}
          </strong>
          {activos && !consulta && !categoriaId && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditando(null)}>
              <Plus size={14} /> Crear producto
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrap" aria-busy={cargando}>
          <table className="table table-stack">
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col" className="col-opcional">Categoría</th>
                <th scope="col">Precio</th>
                <th scope="col">Stock</th>
                <th scope="col" className="col-opcional">Vence</th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => {
                const vence = estadoVencimiento(p.fecha_vencimiento);
                return (
                  <tr key={p.id_producto} className={p.activo ? '' : 'is-off'}>
                    <td className="c-producto">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img className="thumb" src={p.imagen || SIN_IMAGEN} alt="" loading="lazy" />
                        <div>
                          <div className="cell-name">{p.nombre}</div>
                          <div className="cell-code">
                            {p.codigo}
                            {!p.activo && <span className="tag tag-off" style={{ marginLeft: 6 }}>Desactivado</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="muted col-opcional">{nombreCategoria[p.id_categoria] || '—'}</td>
                    <td className="num c-precio" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {soles(p.precio)}
                    </td>
                    <td className="c-stock" style={{ minWidth: 170 }}>
                      <StockEstado stock={p.stock} minimo={p.stock_minimo} />
                    </td>
                    <td className="num col-opcional" style={{ whiteSpace: 'nowrap' }}>
                      {fecha(p.fecha_vencimiento)}
                      {vence && (
                        <div>
                          <span className={`tag tag-${vence.tipo}`}>{vence.texto}</span>
                        </div>
                      )}
                    </td>
                    <td className="c-acciones">
                      <div className="actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditando(p)}>
                          <Pencil size={14} /> Editar
                        </button>
                        {p.activo ? (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => cambiarEstado(p, false)}>
                            <EyeOff size={14} /> Desactivar
                          </button>
                        ) : (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => cambiarEstado(p, true)}>
                            <RotateCcw size={14} /> Reactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <div className="pager">
          <span className="num">
            {desde}–{hasta} de {total}
          </span>
          <div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setPagina(pagina - 1)}
              disabled={pagina <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setPagina(pagina + 1)}
              disabled={pagina >= (paginacion?.total_pages || 1)}
              aria-label="Página siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {editando !== undefined && (
        <ProductoForm
          key={editando?.id_producto ?? 'nuevo'}
          producto={editando}
          categorias={categorias}
          onCerrar={cerrarFormulario}
          onGuardado={alGuardar}
        />
      )}
    </div>
  );
}
