import { useState, useEffect } from 'react';
import { api } from '../api';

const emptyForm = { nombre: '', descripcion: '', imagen: null };

export default function AdminCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [archivo, setArchivo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = () => {
    setLoading(true);
    api('/categorias?limit=100')
      .then((res) => setCategorias(res.data || []))
      .catch((err) => setMsg({ type: 'error', text: err?.message || 'Error' }))
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

  const openEdit = (c) => {
    setForm({
      nombre: c.nombre || '',
      descripcion: c.descripcion || '',
      imagen: c.imagen,
      activo: c.activo,
    });
    setArchivo(null);
    setModal(c);
    setMsg({ type: '', text: '' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });

    try {
      const body = {
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        imagen: null,
      };

      let categoria;
      if (modal === 'create') {
        const res = await api('/categorias', { method: 'POST', body });
        categoria = res.data;
      } else {
        body.activo = form.activo;
        const res = await api(`/categorias/${modal.id_categoria}`, { method: 'PUT', body });
        categoria = res.data;
      }

      if (archivo && categoria?.id_categoria) {
        const fd = new FormData();
        fd.append('imagen', archivo);
        await api(`/categorias/${categoria.id_categoria}/imagen`, { method: 'POST', body: fd });
      }

      setMsg({ type: 'success', text: modal === 'create' ? 'Categoría creada' : 'Categoría actualizada' });
      setModal(null);
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err?.message || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Categorías</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nueva categoría
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
        <div className="category-grid">
          {categorias.map((c) => (
            <div key={c.id_categoria} className="card" style={{ cursor: 'pointer' }} onClick={() => openEdit(c)}>
              <div style={{ aspectRatio: '4/3', background: '#f1f5f9', overflow: 'hidden' }}>
                <img
                  src={c.imagen || '/sin-imagen.svg'}
                  alt={c.nombre}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />
              </div>
              <div style={{ padding: '0.85rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{c.nombre}</h3>
                {c.descripcion && (
                  <p className="text-sm text-muted" style={{ marginTop: 4 }}>
                    {c.descripcion}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'create' ? 'Nueva categoría' : 'Editar categoría'}</h2>
              <button onClick={() => setModal(null)} style={{ fontSize: '1.25rem' }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
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
                      style={{ width: 100, height: 75, objectFit: 'cover', borderRadius: 8, marginTop: 8 }}
                    />
                  )}
                </div>
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
