import { useState } from 'react';
import { api } from '../api';
import { mensajeError } from '../lib/errores';
import Drawer from './Drawer';
import Notice from './Notice';

// Alta rápida desde la caja: solo el nombre es obligatorio para no frenar la venta.
const VACIO = { nombre: '', documento: '', telefono: '', correo: '' };

// El backend guarda null en los opcionales; una cadena vacía chocaría con el índice único del documento.
const limpiar = (form) =>
  Object.fromEntries(Object.entries(form).map(([campo, valor]) => [campo, valor.trim() || null]));

export default function ClienteForm({ inicial, onCerrar, onGuardado }) {
  const [form, setForm] = useState(() => ({ ...VACIO, ...inicial }));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const res = await api('/clientes', { method: 'POST', body: limpiar(form) });
      onGuardado(res.data);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar al cliente.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Drawer
      abierto
      titulo="Nuevo cliente"
      onCerrar={onCerrar}
      onSubmit={guardar}
      pie={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={guardando}>
            {guardando && <span className="spinner" />}
            {guardando ? 'Guardando…' : 'Registrar y usar en la venta'}
          </button>
        </>
      }
    >
      <Notice>{error}</Notice>

      <label className="field">
        <span>Nombre completo o razón social</span>
        <input
          className="input"
          value={form.nombre}
          onChange={cambiar('nombre')}
          maxLength={100}
          autoComplete="off"
          required
          autoFocus
        />
      </label>
      <label className="field">
        <span>DNI o RUC (opcional)</span>
        <input
          className="input num"
          value={form.documento}
          onChange={cambiar('documento')}
          inputMode="numeric"
          maxLength={20}
          autoComplete="off"
          aria-describedby="cliente-documento-ayuda"
        />
        <span className="field-hint" id="cliente-documento-ayuda">
          Úsalo si el cliente pide boleta o factura a su nombre.
        </span>
      </label>
      <label className="field">
        <span>Teléfono (opcional)</span>
        <input
          className="input num"
          type="tel"
          value={form.telefono}
          onChange={cambiar('telefono')}
          maxLength={20}
          autoComplete="off"
        />
      </label>
      <label className="field">
        <span>Correo (opcional)</span>
        <input
          className="input"
          type="email"
          value={form.correo}
          onChange={cambiar('correo')}
          maxLength={100}
          autoComplete="off"
        />
      </label>
    </Drawer>
  );
}
