import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CircleCheck } from 'lucide-react';
import { traerTodos } from '../api';
import { useAuth } from '../context/AuthContext';
import StockEstado from '../components/StockEstado';
import Notice from '../components/Notice';
import { SIN_IMAGEN } from '../components/ProductTile';
import { mensajeError } from '../lib/errores';
import { fecha } from '../lib/formato';

function Tabla({ columnas, filas, vacio, cargando }) {
  if (cargando) return <div className="skeleton" style={{ height: 180 }} />;
  if (filas.length === 0) {
    return (
      <div className="empty">
        <CircleCheck size={28} />
        <strong>{vacio}</strong>
      </div>
    );
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columnas.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{filas}</tbody>
      </table>
    </div>
  );
}

function CeldaProducto({ p }) {
  return (
    <td>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <img className="thumb" src={p.imagen || SIN_IMAGEN} alt="" loading="lazy" />
        <div>
          <div className="cell-name">{p.nombre}</div>
          <div className="cell-code">{p.codigo}</div>
        </div>
      </div>
    </td>
  );
}

export default function StockBajo() {
  const { isAdmin } = useAuth();
  const { hash } = useLocation();
  const [stock, setStock] = useState([]);
  const [vencer, setVencer] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([traerTodos('/inventario/stock-bajo'), traerTodos('/inventario/por-vencer')])
      .then(([listaStock, listaVencer]) => {
        setStock(listaStock);
        setVencer(listaVencer);
      })
      .catch((err) => setError(mensajeError(err, 'No se pudieron cargar las alertas.')))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    if (!cargando && hash) document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
  }, [cargando, hash]);

  const accion = (p) => (
    <td>
      <div className="actions">
        <Link to={`/producto/${p.id_producto}`} className="btn btn-ghost btn-sm">
          Ver
        </Link>
        {isAdmin && (
          <Link to={`/admin/productos?editar=${p.id_producto}`} className="btn btn-ghost btn-sm">
            Reponer
          </Link>
        )}
      </div>
    </td>
  );

  return (
    <div className="stack" style={{ gap: '2.5rem' }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Alertas de inventario</h1>
          <p className="muted">Productos en o por debajo de su stock mínimo y productos que vencen pronto.</p>
        </div>
      </div>

      <Notice>{error}</Notice>

      <section className="stack" aria-labelledby="titulo-stock">
        <div className="row-head" style={{ marginBottom: 0 }}>
          <h2 id="titulo-stock" className="row-title">Stock bajo</h2>
          {!cargando && <span className="tag tag-danger num">{stock.length}</span>}
        </div>
        <Tabla
          cargando={cargando}
          columnas={['Producto', 'Categoría', 'Stock', '']}
          vacio="Todo el stock está por encima del mínimo"
          filas={stock.map((p) => (
            <tr key={p.id_producto}>
              <CeldaProducto p={p} />
              <td className="muted">{p.categoria}</td>
              <td style={{ minWidth: 200 }}>
                <StockEstado stock={p.stock} minimo={p.stock_minimo} />
              </td>
              {accion(p)}
            </tr>
          ))}
        />
      </section>

      <section id="por-vencer" className="stack" aria-labelledby="titulo-vencer">
        <div className="row-head" style={{ marginBottom: 0 }}>
          <h2 id="titulo-vencer" className="row-title">Por vencer</h2>
          {!cargando && <span className="tag tag-warn num">{vencer.length}</span>}
        </div>
        <Tabla
          cargando={cargando}
          columnas={['Producto', 'Vence', 'Quedan', 'Stock', '']}
          vacio="Ningún producto vence pronto"
          filas={vencer.map((p) => (
            <tr key={p.id_producto}>
              <CeldaProducto p={p} />
              <td className="num">{fecha(p.fecha_vencimiento)}</td>
              <td>
                <span className={`tag num ${p.dias_restantes < 0 ? 'tag-danger' : 'tag-warn'}`}>
                  {p.dias_restantes < 0 ? 'Vencido' : `${p.dias_restantes} días`}
                </span>
              </td>
              <td className="num">{p.stock}</td>
              {accion(p)}
            </tr>
          ))}
        />
      </section>
    </div>
  );
}
