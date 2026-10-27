import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function ProductoDetalle() {
  const { id } = useParams();
  const [producto, setProducto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api(`/productos/${id}`)
      .then((res) => setProducto(res.data))
      .catch((err) => setError(err?.message || 'Producto no encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: 300 }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div>
        <div className="error-banner">{error || 'Producto no encontrado'}</div>
        <Link to="/" className="btn btn-outline">
          ← Volver al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="btn btn-outline btn-sm" style={{ marginBottom: '1.5rem' }}>
        ← Volver
      </Link>

      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
        <div style={{ flex: '1 1 280px', maxWidth: 400, background: '#f1f5f9' }}>
          <img
            src={producto.imagen || '/sin-imagen.svg'}
            alt={producto.nombre}
            style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }}
          />
        </div>

        <div style={{ flex: '1 1 300px', padding: '2rem' }}>
          <span className="text-sm text-muted">{producto.codigo}</span>
          <h1 style={{ fontSize: '1.5rem', margin: '0.25rem 0 1rem' }}>{producto.nombre}</h1>

          {producto.descripcion && (
            <p className="text-muted" style={{ marginBottom: '1.25rem' }}>
              {producto.descripcion}
            </p>
          )}

          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '1rem' }}>
            S/ {producto.precio}
          </div>

          <div className="flex gap-2 items-center" style={{ marginBottom: '0.75rem' }}>
            <span className={`badge ${producto.stock <= producto.stock_minimo ? 'badge-warning' : 'badge-success'}`}>
              Stock: {producto.stock}
            </span>
            <span className="text-sm text-muted">Mínimo: {producto.stock_minimo}</span>
          </div>

          {producto.fecha_vencimiento && (
            <p className="text-sm text-muted">
              Vence: {producto.fecha_vencimiento}
            </p>
          )}

          <p className="text-sm mt-2">
            Estado:{' '}
            <span className={`badge ${producto.activo ? 'badge-success' : 'badge-danger'}`}>
              {producto.activo ? 'Activo' : 'Inactivo'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
