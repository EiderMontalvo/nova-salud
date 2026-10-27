import { useState, useEffect } from 'react';
import { api } from '../api';

const emptyForm = {
  id_categoria: '',
  codigo: '',
  nombre: '',
  descripcion: '',
  precio: '',
  stock: 0,
  stock_minimo: 5,
  fecha_vencimiento: '',
  imagen: null,
};

export default function AdminProductos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | producto
  const [form, setForm] = useState(emptyForm);
  const [archivo, setArchivo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = () => {
    setLoading(true);
    Promise.all([
      api('/productos?limit=100'),
      api('/categorias?limit=100'),
    ])
      .then(([prodRes, catRes]) => {
        setProductos(prodRes.data || []);
        setCategorias(catRes.data || []);
      })
      .catch((err) => setMsg({ type: 'error', text: err?.message || 'Error al cargar' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setArchivo(null);
    setModal('create');
    setMsg({ type: '', text: '' });
  };

  const openEdit = (p) => {
    setForm({
      id_categoria: p.id_categoria || '',
      codigo: p.codigo || '',
      nombre: p.nombre || '',
      descripcion: p.descripcion || '',
      precio: p.precio || '',
      stock: p.stock ?? 0,
      stock_minimo: p.stock_minimo ?? 5,
      fecha_vencimiento: p.fecha_vencimiento || '',
      imagen: p.imagen,
      activo: p.activo,
    });
    setArchivo(null);
    setModal(p);
    setMsg({ type: '', text: '' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });

    try {
      const body = {
        id_categoria: Number(form.id_categoria),
        codigo: form.codigo,
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        precio: form.precio,
        stock: Number(form.stock),
        stock_minimo: Number(form.stock_minimo),
        fecha_vencimiento: form.fecha_vencimiento || null,
        imagen: null,
      };

      let producto;
      if (modal === 'create') {
        const res = await api('/productos', { method: 'POST', body });
        producto = res.data;
      } else {
        body.activo = form.activo;
        const res = await api(`/productos/${modal.id_producto}`, { method: 'PUT', body });
        producto = res.data;
      }

      if (archivo && producto?.id_producto) {
        const fd = new FormData();
        fd.append('imagen', archivo);
        await api(`/productos/${producto.id_producto}/imagen`, { method: 'POST', body: fd });
      }

      setMsg({ type: 'success', text: modal === 'create' ? 'Producto creado' : 'Producto actualizado' });
      setModal(null);
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err?.message || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Desactivar este producto?')) return;
    try {
      await api(`/productos/${id}`, { method: 'DELETE' });
      setMsg({ type: 'success', text: 'Producto desactivado' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err?.message || 'Error' });
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Productos</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nuevo producto
        </button>
      </div>

      {msg.text && (
        <div className={msg.type === 'error' ? 'error-banner' : 'success-banner'}>{msg.text}</div>
      )}

      {loading ? (
        <div className="loading-screen" style={{ minHeight: 200 }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id_producto}>
                  <td>{p.codigo}</td>
                  <td>{p.nombre}</td>
                  <td>S/ {p.precio}</td>
                  <td>
                    <span className={`badge ${p.stock <= p.stock_minimo ? 'badge-warning' : 'badge-success'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${p.activo ? 'badge-success' : 'badge-danger'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>
                        Editar
                      </button>
                      {p.activo && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id_producto)}>
                          Desactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'create' ? 'Nuevo producto' : 'Editar producto'}</h2>
              <button onClick={() => setModal(null)} style={{ fontSize: '1.25rem' }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Categoría</label>
                  <select
                    value={form.id_categoria}
                    onChange={(e) => setForm({ ...form, id_categoria: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {categorias.map((c) => (
                      <option key={c.id_categoria} value={c.id_categoria}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Código</label>
                  <input
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Precio</label>
                    <input
                      value={form.precio}
                      onChange={(e) => setForm({ ...form, precio: e.target.value })}
                      required
                      placeholder="5.50"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Stock mínimo</label>
                    <input
                      type="number"
                      min="0"
                      value={form.stock_minimo}
                      onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Fecha de vencimiento</label>
                  <input
                    type="date"
                    value={form.fecha_vencimiento}
                    onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Imagen (JPEG, PNG o WebP, máx. 5 MB)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setArchivo(e.target.files[0] || null)}
                  />
                  {form.imagen && !archivo && (
                    <img
                      src={form.imagen}
                      alt="Actual"
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8 }}
                    />
                  )}
                </div>
                {modal !== 'create' && (
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={form.activo !== false}
                        onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                        style={{ marginRight: 8 }}
                      />
                      Activo
                    </label>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
