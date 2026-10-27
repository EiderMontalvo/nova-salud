import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function StockBajo() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/inventario/stock-bajo')
      .then((res) => setProductos(res.data || []))
      .catch((err) => setError(err?.message || 'Error al cargar'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Stock bajo</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-screen" style={{ minHeight: 200 }}>
          <div className="spinner" />
        </div>
      ) : productos.length === 0 ? (
        <div className="empty-state">
          <p>✅ No hay productos con stock bajo</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Stock</th>
                <th>Mínimo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id_producto}>
                  <td>{p.codigo}</td>
                  <td>{p.nombre}</td>
                  <td>
                    <span className="badge badge-warning">{p.stock}</span>
                  </td>
                  <td>{p.stock_minimo}</td>
                  <td>
                    <Link to={`/producto/${p.id_producto}`} className="btn btn-outline btn-sm">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
