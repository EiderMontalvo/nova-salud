import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Ventas() {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [idCliente, setIdCliente] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [detalles, setDetalles] = useState([{ id_producto: '', cantidad: 1 }]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    api('/clientes?limit=100').then((res) => setClientes(res.data || [])).catch(() => {});
    api('/productos?limit=100').then((res) => setProductos(res.data || [])).catch(() => {});
  }, []);

  const addLinea = () => {
    setDetalles([...detalles, { id_producto: '', cantidad: 1 }]);
  };

  const updateLinea = (idx, field, value) => {
    const next = [...detalles];
    next[idx] = { ...next[idx], [field]: value };
    setDetalles(next);
  };

  const removeLinea = (idx) => {
    if (detalles.length === 1) return;
    setDetalles(detalles.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    setLoading(true);

    try {
      const body = {
        id_cliente: Number(idCliente),
        metodo_pago: metodoPago,
        detalles: detalles
          .filter((d) => d.id_producto)
          .map((d) => ({
            id_producto: Number(d.id_producto),
            cantidad: Number(d.cantidad),
          })),
      };

      if (!body.id_cliente || body.detalles.length === 0) {
        setMsg({ type: 'error', text: 'Selecciona cliente y al menos un producto' });
        return;
      }

      await api('/ventas', { method: 'POST', body });
      setMsg({ type: 'success', text: 'Venta registrada correctamente' });
      setDetalles([{ id_producto: '', cantidad: 1 }]);
      setIdCliente('');
    } catch (err) {
      setMsg({ type: 'error', text: err?.message || 'Error al registrar la venta' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Registrar venta</h1>
      </div>

      {msg.text && (
        <div className={msg.type === 'error' ? 'error-banner' : 'success-banner'}>{msg.text}</div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ padding: '1.5rem', maxWidth: 640 }}>
        <div className="form-group">
          <label>Cliente</label>
          <select value={idCliente} onChange={(e) => setIdCliente(e.target.value)} required>
            <option value="">Seleccionar cliente...</option>
            {clientes.map((c) => (
              <option key={c.id_cliente} value={c.id_cliente}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Método de pago</label>
          <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="YAPE">Yape</option>
            <option value="PLIN">Plin</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </select>
        </div>

        <label style={{ fontWeight: 500, fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>
          Productos
        </label>

        {detalles.map((d, idx) => (
          <div key={idx} className="flex gap-1 items-center" style={{ marginBottom: '0.75rem' }}>
            <select
              value={d.id_producto}
              onChange={(e) => updateLinea(idx, 'id_producto', e.target.value)}
              style={{ flex: 1, padding: '0.55rem', borderRadius: 8, border: '1.5px solid var(--border)' }}
              required
            >
              <option value="">Producto...</option>
              {productos.map((p) => (
                <option key={p.id_producto} value={p.id_producto}>
                  {p.nombre} — S/ {p.precio} (stock: {p.stock})
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={d.cantidad}
              onChange={(e) => updateLinea(idx, 'cantidad', e.target.value)}
              style={{ width: 80, padding: '0.55rem', borderRadius: 8, border: '1.5px solid var(--border)' }}
              required
            />
            <button type="button" className="btn btn-outline btn-sm" onClick={() => removeLinea(idx)}>
              ✕
            </button>
          </div>
        ))}

        <button type="button" className="btn btn-outline btn-sm" onClick={addLinea} style={{ marginBottom: '1.25rem' }}>
          + Agregar producto
        </button>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Registrando...' : 'Registrar venta'}
        </button>
      </form>
    </div>
  );
}
