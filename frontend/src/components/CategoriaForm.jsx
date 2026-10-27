import { useState } from 'react';
import { api, cuerpoCategoria, subirImagen } from '../api';
import { mensajeError } from '../lib/errores';
import Drawer from './Drawer';
import ImageDrop from './ImageDrop';
import Notice from './Notice';

export default function CategoriaForm({ categoria, onCerrar, onGuardado }) {
  const [form, setForm] = useState(() => ({
    nombre: categoria?.nombre || '',
    descripcion: categoria?.descripcion || '',
    imagen: categoria?.imagen || null,
    activo: categoria?.activo,
  }));
  const [archivo, setArchivo] = useState(null);
  const [quitarImagen, setQuitarImagen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [idGuardado, setIdGuardado] = useState(categoria?.id_categoria ?? null);

  const editando = idGuardado !== null;

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const body = cuerpoCategoria(form, { imagen: quitarImagen ? null : form.imagen });
      if (!editando) delete body.activo;

      const res = editando
        ? await api(`/categorias/${idGuardado}`, { method: 'PUT', body })
        : await api('/categorias', { method: 'POST', body });
      let guardada = res.data;
      setIdGuardado(guardada.id_categoria);

      if (archivo) {
        try {
          guardada = (await subirImagen('categorias', guardada.id_categoria, archivo)).data;
        } catch (err) {
          setForm({ ...form, imagen: guardada.imagen });
          setError(`Los datos se guardaron, pero la imagen no: ${mensajeError(err, 'error al subirla')}`);
          return;
        }
      }

      onGuardado(guardada, editando ? 'actualizada' : 'creada');
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar la categoría.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Drawer
      abierto
      titulo={categoria ? 'Editar categoría' : 'Nueva categoría'}
      onCerrar={onCerrar}
      onSubmit={guardar}
      pie={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={guardando}>
            {guardando && <span className="spinner" />}
            {guardando ? 'Guardando…' : categoria ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </>
      }
    >
      <Notice>{error}</Notice>

      <div className="field">
        <span>Imagen</span>
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

      <label className="field">
        <span>Nombre</span>
        <input
          className="input"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          maxLength={100}
          required
        />
      </label>
      <label className="field">
        <span>Descripción</span>
        <textarea
          className="textarea"
          rows={3}
          maxLength={255}
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
        />
      </label>
      {categoria && (
        <label className="check">
          <input
            type="checkbox"
            checked={form.activo !== false}
            onChange={(e) => setForm({ ...form, activo: e.target.checked })}
          />
          Activa
        </label>
      )}
    </Drawer>
  );
}
