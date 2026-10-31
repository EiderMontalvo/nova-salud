import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  PackageSearch,
  Printer,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useVenta } from '../context/VentaContext';
import { useToast } from '../context/ToastContext';
import { useCatalogo, filtrarProductos } from '../hooks/useCatalogo';
import Notice from '../components/Notice';
import ClienteBuscador from '../components/ClienteBuscador';
import PagoDigital from '../components/PagoDigital';
import Marca from '../components/Marca';
import { SIN_IMAGEN } from '../components/ProductTile';
import { mensajeError } from '../lib/errores';
import { tieneMouse } from '../lib/dispositivo';
import { soles, stockBajo } from '../lib/formato';
import logoEfectivo from '../assets/pagos/efectivo.svg';
import logoTarjeta from '../assets/pagos/tarjeta.svg';
import logoYape from '../assets/pagos/yape.webp';
import logoPlin from '../assets/pagos/plin.webp';
import './Ventas.css';

// Cada medio con su imagen para reconocerlo de un vistazo; origen y licencias en assets/pagos/CREDITOS.md.
const METODOS = [
  { valor: 'EFECTIVO', texto: 'Efectivo', logo: logoEfectivo },
  { valor: 'YAPE', texto: 'Yape', logo: logoYape },
  { valor: 'PLIN', texto: 'Plin', logo: logoPlin },
  { valor: 'TARJETA', texto: 'Tarjeta', logo: logoTarjeta },
];

const BILLETES = [10, 20, 50, 100, 200];

const fechaHora = (valor) =>
  new Date(valor).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

function Reloj() {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return <span className="num">{fechaHora(ahora)}</span>;
}

function Selector({ productos, categorias, items, onAgregar }) {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState('');

  const lista = useMemo(() => {
    const base = categoriaId ? productos.filter((p) => p.id_categoria === Number(categoriaId)) : productos;
    return [...filtrarProductos(base, busqueda)].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productos, categoriaId, busqueda]);

  const agregarPrimero = (e) => {
    if (e.key !== 'Enter' || !busqueda.trim()) return;
    e.preventDefault();
    const primero = lista.find((p) => p.stock > 0);
    if (primero) {
      onAgregar(primero);
      setBusqueda('');
    }
  };

  return (
    <section className="pos-productos" aria-label="Productos">
      <div className="pos-filtros">
        <div className="search search-lg">
          <Search size={20} />
          <input
            className="input"
            type="search"
            placeholder="Buscar producto o código"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={agregarPrimero}
            aria-label="Buscar producto"
            autoFocus={tieneMouse()}
          />
        </div>
        <select
          className="select"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          aria-label="Categoría"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id_categoria} value={c.id_categoria}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      {lista.length === 0 ? (
        <div className="empty">
          <PackageSearch size={28} />
          <span>Sin coincidencias para «{busqueda}»</span>
        </div>
      ) : (
        <ul className="pos-grid">
          {lista.map((p) => {
            const enVenta = items.find((i) => i.id_producto === p.id_producto);
            const sinStock = p.stock === 0 || (enVenta && enVenta.cantidad >= p.stock);
            return (
              <li key={p.id_producto}>
                <button
                  type="button"
                  className={enVenta ? 'pos-card is-in' : 'pos-card'}
                  onClick={() => onAgregar(p)}
                  disabled={sinStock}
                  aria-label={`Agregar ${p.nombre}, ${soles(p.precio)}`}
                >
                  <span className="pos-card-foto">
                    <img src={p.imagen || SIN_IMAGEN} alt="" loading="lazy" />
                    {enVenta && <span className="pos-card-cant num">{enVenta.cantidad}</span>}
                  </span>
                  <span className="pos-card-nombre">{p.nombre}</span>
                  <span className="pos-card-pie">
                    <span className="price">{soles(p.precio)}</span>
                    <span className={stockBajo(p) ? 'small texto-danger num' : 'small muted num'}>
                      {p.stock === 0 ? 'Agotado' : `${p.stock} u.`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Comprobante({ venta, cobro, vendedor, cliente, onNueva }) {
  const metodo = METODOS.find((m) => m.valor === venta.metodo_pago)?.texto;
  return (
    <div className="ticket ticket-papel" id="comprobante">
      <div className="ticket-cabecera">
        <Marca />
        <span className="small muted">Ticket de venta · uso interno</span>
      </div>
      <dl className="ticket-meta">
        <div>
          <dt>Venta</dt>
          <dd className="num">Nº {String(venta.id_venta).padStart(6, '0')}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd className="num">{fechaHora(venta.fecha)}</dd>
        </div>
        <div>
          <dt>Atendió</dt>
          <dd>{vendedor}</dd>
        </div>
        <div>
          <dt>Cliente</dt>
          <dd>{cliente || 'Venta al paso'}</dd>
        </div>
      </dl>
      <ul className="ticket-lineas">
        {venta.detalles.map((d) => (
          <li key={d.id_detalle}>
            <span>{d.nombre}</span>
            <span className="num muted">
              {d.cantidad} × {soles(d.precio_unitario)}
            </span>
            <span className="num">{soles(d.subtotal)}</span>
          </li>
        ))}
      </ul>
      <div className="ticket-total">
        <span>Total</span>
        <span className="price num">{soles(venta.total)}</span>
      </div>
      <dl className="ticket-meta">
        <div>
          <dt>Pago</dt>
          <dd>{metodo}</dd>
        </div>
        {cobro.recibido !== null && (
          <>
            <div>
              <dt>Recibido</dt>
              <dd className="num">{soles(cobro.recibido)}</dd>
            </div>
            <div>
              <dt>Vuelto</dt>
              <dd className="num">{soles(cobro.recibido - Number(venta.total))}</dd>
            </div>
          </>
        )}
      </dl>
      <p className="ticket-gracias">Gracias por su compra</p>

      <div className="ticket-acciones no-print">
        {venta.alertas_stock?.length > 0 && (
          <Notice tipo="warn">
            Quedan pocas unidades de {venta.alertas_stock.map((a) => `${a.nombre} (${a.stock})`).join(', ')}.{' '}
            <Link to="/stock-bajo">Ver alertas</Link>
          </Notice>
        )}
        <div className="ticket-botones">
          <button type="button" className="btn btn-ghost btn-lg" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </button>
          <button type="button" className="btn btn-primary btn-lg" onClick={onNueva} autoFocus>
            Nueva venta
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Ventas() {
  const { usuario } = useAuth();
  const { productos, categorias, cargando, error: errorCatalogo, recargar } = useCatalogo();
  const { items, agregar, cambiarCantidad, quitar, vaciar, total, unidades } = useVenta();
  const [cliente, setCliente] = useState(null);
  const avisar = useToast();
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [recibido, setRecibido] = useState('');
  const [pagoConfirmado, setPagoConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);

  const efectivo = metodoPago === 'EFECTIVO';
  const montoRecibido = recibido === '' ? null : Number(String(recibido).replace(',', '.'));
  const totalRedondeado = Math.round(total * 100) / 100;
  const vuelto = montoRecibido === null ? null : montoRecibido - totalRedondeado;
  const pagoListo = efectivo ? vuelto !== null && vuelto >= 0 : pagoConfirmado;
  const puedeCobrar = items.length > 0 && pagoListo && !enviando;

  const elegirMetodo = (valor) => {
    setMetodoPago(valor);
    setPagoConfirmado(false);
  };

  const cobrar = async () => {
    setError('');
    setEnviando(true);
    try {
      const res = await api('/ventas', {
        method: 'POST',
        body: {
          id_cliente: cliente?.id_cliente ?? null,
          metodo_pago: metodoPago,
          detalles: items.map((i) => ({ id_producto: i.id_producto, cantidad: i.cantidad })),
        },
      });
      avisar({ tipo: 'success', texto: 'Venta registrada. El stock ya se descontó.' });
      setResultado({
        venta: res.data,
        cobro: { recibido: efectivo ? montoRecibido : null },
        cliente: cliente?.nombre,
      });
      vaciar();
      recargar();
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar la venta.'));
    } finally {
      setEnviando(false);
    }
  };

  const nuevaVenta = () => {
    setResultado(null);
    setCliente(null);
    setMetodoPago('EFECTIVO');
    setRecibido('');
    setPagoConfirmado(false);
  };

  return (
    <div className="pos">
      {/* El título va en la columna de productos para que el ticket arranque arriba y quepa entero en pantalla. */}
      <div className="pos-cuerpo">
        <div className="no-print">
          <div className="page-head">
            <div>
              <h1 className="page-title">Nueva venta</h1>
              <p className="muted">
                Atiende {usuario?.nombre} · <Reloj />
              </p>
            </div>
          </div>
          {cargando ? (
            <div className="skeleton" style={{ minHeight: 480 }} />
          ) : errorCatalogo ? (
            <Notice>{errorCatalogo}</Notice>
          ) : (
            <Selector productos={productos} categorias={categorias} items={items} onAgregar={agregar} />
          )}
        </div>

        <aside className="pos-ticket" id="ticket" aria-label="Ticket">
          {resultado ? (
            <Comprobante
              venta={resultado.venta}
              cobro={resultado.cobro}
              cliente={resultado.cliente}
              vendedor={usuario?.nombre}
              onNueva={nuevaVenta}
            />
          ) : (
            <div className="ticket ticket-venta">
              <div className="ticket-head">
                <ShoppingCart size={18} />
                <h2 className="row-title">Ticket</h2>
                <span className="muted small num">
                  {unidades} {unidades === 1 ? 'unidad' : 'unidades'}
                </span>
                {items.length > 0 && (
                  <button type="button" className="link-btn ticket-vaciar" onClick={vaciar}>
                    Vaciar
                  </button>
                )}
              </div>

              {/* El cuerpo desplaza por dentro; el pie con total y «Cobrar» queda siempre a la vista. */}
              <div className="ticket-cuerpo">
                {items.length === 0 ? (
                  <div className="ticket-vacio">
                    <ShoppingCart size={28} />
                    <span>Elige productos de la izquierda. También puedes agregarlos desde el catálogo.</span>
                  </div>
                ) : (
                  <ul className="ticket-items">
                    {items.map((i) => (
                      <li key={i.id_producto}>
                        <img src={i.imagen || SIN_IMAGEN} alt="" />
                        <div className="ticket-item-texto">
                          <span className="cell-name">{i.nombre}</span>
                          <span className="cell-code num">{soles(i.precio)} c/u</span>
                        </div>
                        <span className="ticket-subtotal num">{soles(i.precio * i.cantidad)}</span>
                        <div className="stepper">
                          <button
                            type="button"
                            onClick={() => cambiarCantidad(i.id_producto, i.cantidad - 1)}
                            disabled={i.cantidad <= 1}
                            aria-label={`Quitar una unidad de ${i.nombre}`}
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            className="num"
                            type="number"
                            min="1"
                            max={i.stock}
                            value={i.cantidad}
                            onChange={(e) => cambiarCantidad(i.id_producto, Number(e.target.value) || 1)}
                            aria-label={`Cantidad de ${i.nombre}`}
                          />
                          <button
                            type="button"
                            onClick={() => cambiarCantidad(i.id_producto, i.cantidad + 1)}
                            disabled={i.cantidad >= i.stock}
                            aria-label={`Sumar una unidad de ${i.nombre}`}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          type="button"
                          className="ticket-quitar"
                          onClick={() => quitar(i.id_producto)}
                          aria-label={`Quitar ${i.nombre}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="field">
                  <span>Cliente</span>
                  <ClienteBuscador cliente={cliente} onCambiar={setCliente} />
                </div>

                <div className="field">
                  <span>Forma de pago</span>
                  <div className="metodos" role="group" aria-label="Forma de pago">
                    {METODOS.map(({ valor, texto, logo }) => (
                      <button
                        key={valor}
                        type="button"
                        aria-pressed={metodoPago === valor}
                        onClick={() => elegirMetodo(valor)}
                      >
                        <span className="metodo-marca" aria-hidden="true">
                          <img src={logo} alt="" width="28" height="28" />
                        </span>
                        {texto}
                      </button>
                    ))}
                  </div>
                </div>

                {efectivo ? (
                  <div className="cobro">
                    <label className="field">
                      <span>Monto recibido (S/)</span>
                      <input
                        className="input input-monto num"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={recibido}
                        onChange={(e) => setRecibido(e.target.value)}
                        disabled={items.length === 0}
                      />
                    </label>
                    <div className="billetes">
                      <button
                        type="button"
                        onClick={() => setRecibido(totalRedondeado.toFixed(2))}
                        disabled={items.length === 0}
                      >
                        Exacto
                      </button>
                      {BILLETES.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setRecibido(String(b))}
                          disabled={items.length === 0 || b < totalRedondeado}
                        >
                          S/ {b}
                        </button>
                      ))}
                    </div>
                    <div className={vuelto !== null && vuelto < 0 ? 'vuelto is-falta' : 'vuelto'}>
                      <span>{vuelto !== null && vuelto < 0 ? 'Falta' : 'Vuelto'}</span>
                      <span className="price num">{vuelto === null ? '—' : soles(Math.abs(vuelto))}</span>
                    </div>
                  </div>
                ) : (
                  <PagoDigital
                    metodo={metodoPago}
                    monto={totalRedondeado}
                    confirmado={pagoConfirmado}
                    onConfirmar={setPagoConfirmado}
                    deshabilitado={items.length === 0}
                  />
                )}
              </div>

              <div className="ticket-pie">
                <Notice>{error}</Notice>
                <div className="ticket-total">
                  <span>Total a cobrar</span>
                  <span className="price num">{soles(totalRedondeado)}</span>
                </div>
                <button type="button" className="btn btn-primary btn-lg btn-block" onClick={cobrar} disabled={!puedeCobrar}>
                  {enviando && <span className="spinner" />}
                  {enviando ? 'Registrando…' : `Cobrar ${soles(totalRedondeado)}`}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {!resultado && items.length > 0 && (
        <a href="#ticket" className="pos-barra no-print">
          <span>
            <ShoppingCart size={16} /> {unidades} {unidades === 1 ? 'unidad' : 'unidades'}
          </span>
          <span className="price num">Cobrar {soles(totalRedondeado)}</span>
        </a>
      )}
    </div>
  );
}
