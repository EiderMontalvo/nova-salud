import { Link } from 'react-router-dom';
import { Plus, Check } from 'lucide-react';
import StockEstado from './StockEstado';
import { useVenta } from '../context/VentaContext';
import { soles, fecha, estadoVencimiento, stockBajo } from '../lib/formato';

export const SIN_IMAGEN = '/sin-imagen.svg';

// En una hilera la tile se expande al enfocarla; en una retícula muestra todo de una vez.
export default function ProductTile({ producto, categoria, expandible = true }) {
  const { items, agregar } = useVenta();
  const enVenta = items.find((i) => i.id_producto === producto.id_producto);
  const agotado = producto.stock === 0;
  const bajo = stockBajo(producto);
  const vence = estadoVencimiento(producto.fecha_vencimiento);
  const tope = enVenta && enVenta.cantidad >= producto.stock;

  return (
    <article className={expandible ? 'tile tile-expand' : 'tile'}>
      <div className="tile-main">
        <Link to={`/producto/${producto.id_producto}`} className="tile-photo" aria-label={`Ver ${producto.nombre}`}>
          <img src={producto.imagen || SIN_IMAGEN} alt="" loading="lazy" width="400" height="400" />
        </Link>
        <div className="tile-caption">
          <h3 title={producto.nombre}>{producto.nombre}</h3>
          <div className="tile-linea">
            <span className="tile-price price">{soles(producto.precio)}</span>
            {bajo && <span className="tile-alerta num">{agotado ? 'Agotado' : `Quedan ${producto.stock}`}</span>}
          </div>
        </div>
      </div>

      <div className="tile-detail">
        <div className="tile-detail-inner">
          <div className="tile-detail-nombre">{producto.nombre}</div>
          <div className="cell-code">
            {producto.codigo}
            {categoria && ` · ${categoria}`}
          </div>
          <StockEstado stock={producto.stock} minimo={producto.stock_minimo} />
          <dl className="tile-facts">
            <div>
              <dt>Vence</dt>
              <dd className={vence ? `num texto-${vence.tipo}` : 'num'}>
                {fecha(producto.fecha_vencimiento)}
                {vence && ` · ${vence.texto.toLowerCase()}`}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            className="btn btn-primary btn-sm btn-block"
            onClick={() => agregar(producto)}
            disabled={agotado || tope}
          >
            {enVenta ? <Check size={14} /> : <Plus size={14} />}
            {agotado ? 'Sin stock' : enVenta ? `En venta · ${enVenta.cantidad}` : 'Agregar a venta'}
          </button>
        </div>
      </div>
    </article>
  );
}
