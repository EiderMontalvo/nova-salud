import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Check, Pencil } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useVenta } from '../context/VentaContext';
import StockEstado from '../components/StockEstado';
import Notice from '../components/Notice';
import { SIN_IMAGEN } from '../components/ProductTile';
import { mensajeError } from '../lib/errores';
import { soles, fecha, estadoVencimiento } from '../lib/formato';
import './Detalle.css';

export default function ProductoDetalle() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const { items, agregar } = useVenta();
  const [producto, setProducto] = useState(null);
  const [categoria, setCategoria] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError('');

    api(`/productos/${id}`)
      .then(async (res) => {
        if (!vigente) return;
        setProducto(res.data);
        const cat = await api(`/categorias/${res.data.id_categoria}`).catch(() => null);
        if (vigente) setCategoria(cat?.data?.nombre || '');
      })
      .catch((err) => vigente && setError(mensajeError(err, 'Producto no encontrado')))
      .finally(() => vigente && setCargando(false));

    return () => {
      vigente = false;
    };
  }, [id]);

  if (cargando) {
    return (
      <div className="detalle">
        <div className="skeleton detalle-foto" />
        <div className="stack">
          <div className="skeleton" style={{ height: 40, width: '70%' }} />
          <div className="skeleton" style={{ height: 120 }} />
        </div>
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="stack" style={{ maxWidth: 520 }}>
        <Notice>{error || 'Producto no encontrado'}</Notice>
        <div>
          <Link to="/" className="btn btn-ghost">
            <ArrowLeft size={16} /> Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  const enVenta = items.find((i) => i.id_producto === producto.id_producto);
  const vence = estadoVencimiento(producto.fecha_vencimiento);
  const agotado = producto.stock === 0;

  return (
    <div>
      <Link to="/" className="btn btn-ghost btn-sm" style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={14} /> Catálogo
      </Link>

      <div className="detalle">
        <div className="detalle-foto">
          <img src={producto.imagen || SIN_IMAGEN} alt={producto.nombre} />
        </div>

        <div className="detalle-info">
          <h1 className="page-title detalle-titulo">{producto.nombre}</h1>

          {!producto.activo && <Notice tipo="warn">Este producto está desactivado y no aparece en el catálogo.</Notice>}

          <div className="detalle-precio num">{soles(producto.precio)}</div>

          <dl className="detalle-datos">
            <div>
              <dt>Código</dt>
              <dd className="num">{producto.codigo}</dd>
            </div>
            <div>
              <dt>Categoría</dt>
              <dd>{categoria || '—'}</dd>
            </div>
            <div>
              <dt>Stock</dt>
              <dd>
                <StockEstado stock={producto.stock} minimo={producto.stock_minimo} />
              </dd>
            </div>
            <div>
              <dt>Vencimiento</dt>
              <dd className="num">
                {fecha(producto.fecha_vencimiento)}
                {vence && <span className={`tag tag-${vence.tipo}`} style={{ marginLeft: 8 }}>{vence.texto}</span>}
              </dd>
            </div>
          </dl>

          {producto.descripcion && <p className="detalle-desc">{producto.descripcion}</p>}

          <div className="detalle-acciones">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => agregar(producto)}
              disabled={agotado || !producto.activo || (enVenta && enVenta.cantidad >= producto.stock)}
            >
              {enVenta ? <Check size={16} /> : <Plus size={16} />}
              {agotado ? 'Sin stock' : enVenta ? `En venta · ${enVenta.cantidad}` : 'Agregar a venta'}
            </button>
            {enVenta && (
              <Link to="/ventas" className="btn btn-ghost btn-lg">
                Ir a la venta
              </Link>
            )}
            {isAdmin && (
              <Link to={`/admin/productos?editar=${producto.id_producto}`} className="btn btn-ghost btn-lg">
                <Pencil size={16} /> Editar
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
