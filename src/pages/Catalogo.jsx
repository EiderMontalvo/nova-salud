import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import './Catalogo.css';

export default function Catalogo() {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [categoriaId, setCategoriaId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/categorias?limit=100')
      .then((res) => setCategorias(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams({ page, limit: 12 });
    if (categoriaId) params.set('id_categoria', categoriaId);
    if (search.trim()) params.set('search', search.trim());

    api(`/productos?${params}`)
      .then((res) => {
        setProductos(res.data || []);
        setPagination(res.pagination || null);
      })
      .catch((err) => setError(err?.message || 'Error al cargar productos'))
      .finally(() => setLoading(false));
  }, [categoriaId, search, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Catálogo</h1>
      </div>

      {/* Categorías */}
      <div className="category-pills">
        <button
          className={`pill ${!categoriaId ? 'active' : ''}`}
          onClick={() => {
            setCategoriaId('');
            setPage(1);
          }}
        >
          Todas
        </button>
        {categorias.map((c) => (
          <button
            key={c.id_categoria}
            className={`pill ${categoriaId == c.id_categoria ? 'active' : ''}`}
            onClick={() => {
              setCategoriaId(c.id_categoria);
              setPage(1);
            }}
          >
            {c.nombre}
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <form className="filters" onSubmit={handleSearch}>
        <input
          type="search"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm">
          Buscar
        </button>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-screen" style={{ minHeight: 200 }}>
          <div className="spinner" />
        </div>
      ) : productos.length === 0 ? (
        <div className="empty-state">
          <p>No se encontraron productos</p>
        </div>
      ) : (
        <>
          <div className="product-grid">
            {productos.map((p) => (
              <Link to={`/producto/${p.id_producto}`} key={p.id_producto} className="product-card">
                <div className="product-img">
                  <img
                    src={p.imagen || '/sin-imagen.svg'}
                    alt={p.nombre}
                    loading="lazy"
                    width="400"
                    height="400"
                    style={{ objectFit: 'cover', aspectRatio: '1 / 1' }}
                  />
                </div>
                <div className="product-info">
                  <span className="product-code">{p.codigo}</span>
                  <h3>{p.nombre}</h3>
                  <div className="product-footer">
                    <span className="product-price">S/ {p.precio}</span>
                    <span className={`badge ${p.stock <= p.stock_minimo ? 'badge-warning' : 'badge-success'}`}>
                      Stock: {p.stock}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {pagination && pagination.total_pages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ← Anterior
              </button>
              <span className="text-sm text-muted">
                Página {pagination.page} de {pagination.total_pages}
              </span>
              <button
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
