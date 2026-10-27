import { useState } from 'react';
import { api, cuerpoProducto, subirImagen } from '../api';
import { mensajeError } from '../lib/errores';
import Drawer from './Drawer';
import ImageDrop from './ImageDrop';
import Notice from './Notice';

const VACIO = {
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

const PRECIO_VALIDO = /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/;

function aFormulario(producto) {
  if (!producto) return VACIO;
  return {
    ...VACIO,
    ...producto,
    descripcion: producto.descripcion || '',
    fecha_vencimiento: producto.fecha_vencimiento || '',
  };
}

// producto: null para crear, o el producto completo para editar.
export default function ProductoForm({ producto, categorias, onCerrar, onGuardado }) {
  const [form, setForm] = useState(() => aFormulario(producto));
  const [archivo, setArchivo] = useState(null);
  const [quitarImagen, setQuitarImagen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  // Si el producto se creó pero la imagen falló, los siguientes intentos editan en vez de duplicar.
  const [idGuardado, setIdGuardado] = useState(producto?.id_producto ?? null);

  const editando = idGuardado !== null;
  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    setError('');

    const precio = String(form.precio).trim().replace(',', '.');
    if (!PRECIO_VALIDO.test(precio)) {
      setError('El precio debe ser un número con hasta dos decimales, por ejemplo 5.50.');
      return;
    }

    setGuardando(true);
    try {
      const body = cuerpoProducto(form, { precio, imagen: quitarImagen ? null : form.imagen });
      if (!editando) delete body.activo;

      const res = editando
        ? await api(`/productos/${idGuardado}`, { method: 'PUT', body })
        : await api('/productos', { method: 'POST', body });
      let guardado = res.data;
      setIdGuardado(guardado.id_producto);

      if (archivo) {
        try {
          guardado = (await subirImagen('productos', guardado.id_producto, archivo)).data;
        } catch (err) {
          setForm(aFormulario(guardado));
          setError(`Los datos se guardaron, pero la imagen no: ${mensajeError(err, 'error al subirla')}`);
          return;
        }
      }

      onGuardado(guardado, editando ? 'actualizado' : 'creado');
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar el producto.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Drawer
      abierto
      titulo={producto ? 'Editar producto' : 'Nuevo producto'}
      onCerrar={onCerrar}
      onSubmit={guardar}
      pie={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={guardando}>
            {guardando && <span className="spinner" />}
            {guardando ? 'Guardando…' : producto ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </>
      }
    >
      <Notice>{error}</Notice>

      <div className="field">
        <span>Foto</span>
        <ImageDrop
          actual={form.imagen}
          archivo={archivo}
          quitar={quitarImagen}
          onArchivo={(f) => {
            setArchivo(f);
            if (f) setQuitarImagen(false);
          }}
          onQuitar={setQuitarImagen}
          onError={setError}
        />
      </div>

      <div className="form-grid">
        <label className="field full">
          <span>Nombre</span>
          <input className="input" value={form.nombre} onChange={cambiar('nombre')} maxLength={150} required />
        </label>
        <label className="field">
          <span>Código</span>
          <input
            className="input"
            value={form.codigo}
            onChange={cambiar('codigo')}
            maxLength={50}
            placeholder="MED021"
            required
          />
        </label>
        <label className="field">
          <span>Categoría</span>
          <select className="select" value={form.id_categoria} onChange={cambiar('id_categoria')} required>
            <option value="">Elegir…</option>
            {categorias.map((c) => (
              <option key={c.id_categoria} value={c.id_categoria}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Precio (S/)</span>
          <input
            className="input num"
            inputMode="decimal"
            value={form.precio}
            onChange={cambiar('precio')}
            placeholder="5.50"
            required
          />
        </label>
        <label className="field">
          <span>Vencimiento</span>
          <input className="input" type="date" value={form.fecha_vencimiento} onChange={cambiar('fecha_vencimiento')} />
        </label>
        <label className="field">
          <span>Stock</span>
          <input className="input num" type="number" min="0" value={form.stock} onChange={cambiar('stock')} required />
        </label>
        <label className="field">
          <span>Stock mínimo</span>
          <input
            className="input num"
            type="number"
            min="0"
            value={form.stock_minimo}
            onChange={cambiar('stock_minimo')}
            required
          />
          <span className="field-hint">Por debajo de este número salta la alerta.</span>
        </label>
        <label className="field full">
          <span>Descripción</span>
          <textarea className="textarea" rows={3} value={form.descripcion} onChange={cambiar('descripcion')} />
        </label>
        {producto && (
          <label className="check full">
            <input
              type="checkbox"
              checked={form.activo !== false}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            Activo (visible en el catálogo y en ventas)
          </label>
        )}
      </div>
    </Drawer>
  );
}
