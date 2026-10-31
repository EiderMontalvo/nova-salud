import { useEffect, useId, useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { api } from '../api';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../context/ToastContext';
import ClienteForm from './ClienteForm';

// Por privacidad no se lista la cartera de clientes: solo se consulta a partir de este largo y con pocos resultados.
const MINIMO = 3;
const MAXIMO_RESULTADOS = 5;

// Lo escrito se reaprovecha al registrar: dígitos van al documento, el resto al nombre.
const datosIniciales = (texto) => (/^\d+$/.test(texto) ? { documento: texto } : { nombre: texto });

export default function ClienteBuscador({ cliente, onCambiar }) {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);
  const [registrando, setRegistrando] = useState(false);
  const consulta = useDebounce(texto.trim());
  const avisar = useToast();
  const idLista = useId();

  const suficiente = consulta.length >= MINIMO;

  useEffect(() => {
    if (!suficiente) {
      setResultados([]);
      return;
    }
    let vigente = true;
    setBuscando(true);
    api(`/clientes?${new URLSearchParams({ search: consulta, limit: MAXIMO_RESULTADOS })}`)
      .then((res) => vigente && setResultados(res.data))
      .catch(() => vigente && setResultados([]))
      .finally(() => vigente && setBuscando(false));
    return () => {
      vigente = false;
    };
  }, [consulta, suficiente]);

  const elegir = (elegido) => {
    onCambiar(elegido);
    setTexto('');
    setResultados([]);
    setAbierto(false);
    setActivo(-1);
  };

  const alRegistrar = (nuevo) => {
    setRegistrando(false);
    elegir(nuevo);
    avisar({ tipo: 'success', texto: `Cliente «${nuevo.nombre}» registrado y elegido para esta venta.` });
  };

  const alTeclear = (e) => {
    if (e.key === 'ArrowDown' && resultados.length) {
      e.preventDefault();
      setAbierto(true);
      setActivo((i) => (i + 1) % resultados.length);
    } else if (e.key === 'ArrowUp' && resultados.length) {
      e.preventDefault();
      setActivo((i) => (i <= 0 ? resultados.length - 1 : i - 1));
    } else if (e.key === 'Enter' && abierto && resultados[activo]) {
      e.preventDefault();
      elegir(resultados[activo]);
    } else if (e.key === 'Escape') {
      setAbierto(false);
    }
  };

  const formulario = registrando && (
    <ClienteForm inicial={datosIniciales(texto.trim())} onCerrar={() => setRegistrando(false)} onGuardado={alRegistrar} />
  );

  // Con un cliente elegido se muestra solo ese, con la opción de quitarlo y volver a venta al paso.
  if (cliente) {
    return (
      <div className="cliente-elegido">
        <div>
          <div className="cliente-elegido-nombre">{cliente.nombre}</div>
          {cliente.documento && <div className="cell-code">{cliente.documento}</div>}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onCambiar(null)}>
          <X size={14} aria-hidden="true" /> Quitar
        </button>
      </div>
    );
  }

  const mostrarLista = abierto && suficiente && !buscando;

  return (
    <div className="cliente-buscador">
      <div className="cliente-fila">
        <div className="search">
          <Search size={16} aria-hidden="true" />
          <input
            className="input"
            type="search"
            role="combobox"
            aria-expanded={mostrarLista}
            aria-controls={idLista}
            aria-activedescendant={activo >= 0 ? `${idLista}-${activo}` : undefined}
            aria-describedby={`${idLista}-ayuda`}
            aria-label="Buscar cliente por DNI, RUC o nombre"
            placeholder="DNI, RUC o nombre"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setAbierto(true);
              setActivo(-1);
            }}
            onKeyDown={alTeclear}
            onBlur={() => setTimeout(() => setAbierto(false), 150)}
            autoComplete="off"
          />
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => setRegistrando(true)}>
          <UserPlus size={16} aria-hidden="true" /> Nuevo
        </button>
      </div>

      <p className="field-hint" id={`${idLista}-ayuda`}>
        {texto.trim() && !suficiente
          ? `Escribe al menos ${MINIMO} caracteres para buscar.`
          : 'Déjalo vacío para una venta al paso.'}
      </p>

      {mostrarLista && (
        <ul className="cliente-resultados" id={idLista} role="listbox" aria-label="Clientes encontrados">
          {resultados.map((c, i) => (
            <li
              key={c.id_cliente}
              id={`${idLista}-${i}`}
              role="option"
              aria-selected={i === activo}
              className={i === activo ? 'is-activo' : undefined}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => elegir(c)}
            >
              <span className="cliente-elegido-nombre">{c.nombre}</span>
              {c.documento && <span className="cell-code">{c.documento}</span>}
            </li>
          ))}
          {resultados.length === 0 && (
            <li className="cliente-sin-resultados" role="presentation">
              No hay clientes con «{consulta}».{' '}
              <button type="button" className="link-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => setRegistrando(true)}>
                Registrarlo
              </button>
            </li>
          )}
        </ul>
      )}

      {formulario}
    </div>
  );
}
