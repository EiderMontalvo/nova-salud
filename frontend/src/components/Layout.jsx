import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  ShoppingCart,
  TriangleAlert,
  Package,
  Tags,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVenta } from '../context/VentaContext';
import { usePreferencia } from '../hooks/usePreferencia';
import { api } from '../api';
import Marca, { Corazon } from './Marca';
import ThemeToggle from './ThemeToggle';
import './Layout.css';

// Una sola definición de la navegación para el riel de escritorio y la barra inferior del móvil.
const SECCIONES = [
  {
    titulo: 'Tienda',
    enlaces: [
      { to: '/', end: true, icono: LayoutGrid, texto: 'Catálogo', ayuda: 'Buscar productos y precios' },
      { to: '/ventas', icono: ShoppingCart, texto: 'Vender', ayuda: 'Registrar una venta', contador: 'venta' },
      { to: '/stock-bajo', icono: TriangleAlert, texto: 'Alertas', ayuda: 'Stock bajo y por vencer', contador: 'alertas' },
    ],
  },
  {
    titulo: 'Administración',
    soloAdmin: true,
    enlaces: [
      { to: '/admin/productos', icono: Package, texto: 'Productos', ayuda: 'Crear y editar' },
      { to: '/admin/categorias', icono: Tags, texto: 'Categorías', ayuda: 'Organizar el catálogo' },
    ],
  },
];

const enlaceClase = ({ isActive }) => (isActive ? 'rail-link active' : 'rail-link');

function iniciales(nombre = '') {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('');
}

export default function Layout() {
  const { usuario, logout, isAdmin } = useAuth();
  const { unidades } = useVenta();
  const navigate = useNavigate();
  const location = useLocation();
  const [alertas, setAlertas] = useState({ stock: null, vencer: null });
  const [plegado, setPlegado] = usePreferencia('nova-salud-riel-plegado', false);
  const contenidoRef = useRef(null);
  const rutaAnterior = useRef(location.pathname);

  // Se recalcula al navegar para que una venta o una edición se refleje en los contadores.
  useEffect(() => {
    Promise.all([api('/inventario/stock-bajo?limit=1'), api('/inventario/por-vencer?limit=1')])
      .then(([stock, vencer]) =>
        setAlertas({ stock: stock?.pagination?.total ?? 0, vencer: vencer?.pagination?.total ?? 0 })
      )
      .catch(() => {});
  }, [location.pathname]);

  // Al cambiar de pantalla, el foco pasa al contenido para que el lector anuncie la página nueva,
  // salvo que la página ya haya enfocado algo propio (p. ej. su buscador).
  useEffect(() => {
    // Se compara con la ruta anterior (no con un «primer render») para que el doble efecto de StrictMode no robe el foco al cargar.
    if (rutaAnterior.current === location.pathname) return;
    rutaAnterior.current = location.pathname;
    const main = contenidoRef.current;
    if (main && !main.contains(document.activeElement)) main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const salir = () => {
    logout();
    navigate('/login');
  };

  const contadores = {
    venta: unidades,
    alertas: (alertas.stock || 0) + (alertas.vencer || 0),
  };

  const secciones = SECCIONES.filter((s) => !s.soloAdmin || isAdmin);
  const rol = usuario?.rol === 'ADMIN' ? 'Administrador' : 'Vendedor';

  return (
    <div className={plegado ? 'shell is-plegado' : 'shell'}>
      <a href="#contenido" className="saltar">
        Saltar al contenido
      </a>
      <aside className="rail">
        <div className="rail-brand">
          {plegado ? <Corazon className="marca-corazon" /> : <Marca claro />}
        </div>

        <nav className="rail-nav" aria-label="Principal">
          {secciones.map((seccion) => (
            <div key={seccion.titulo} className="rail-grupo">
              <div className="rail-section">{seccion.titulo}</div>
              {seccion.enlaces.map(({ to, end, icono: Icono, texto, ayuda, contador }) => {
                const cuenta = contador ? contadores[contador] : 0;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={enlaceClase}
                    title={plegado ? `${texto}: ${ayuda}` : undefined}
                    aria-label={plegado ? (cuenta > 0 ? `${texto}, ${cuenta}` : texto) : undefined}
                  >
                    <Icono size={18} className="rail-icono" aria-hidden="true" />
                    <span className="rail-texto">
                      <span className="rail-titulo">{texto}</span>
                      <span className="rail-ayuda">{ayuda}</span>
                    </span>
                    {cuenta > 0 && <span className="rail-count num">{cuenta}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <button
          type="button"
          className="rail-plegar"
          onClick={() => setPlegado((actual) => !actual)}
          aria-expanded={!plegado}
          aria-label={plegado ? 'Mostrar menú' : undefined}
          title={plegado ? 'Mostrar menú' : undefined}
        >
          {plegado ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          <span className="rail-texto">Ocultar menú</span>
        </button>
      </aside>

      <header className="topbar">
        <span className="topbar-marca">
          <Marca />
        </span>
        <div className="topbar-usuario">
          <span className="avatar" aria-hidden="true">
            {iniciales(usuario?.nombre)}
          </span>
          <span className="topbar-usuario-texto">
            <span className="topbar-usuario-nombre">{usuario?.nombre}</span>
            <span className="topbar-usuario-rol">{rol}</span>
          </span>
        </div>
        <ThemeToggle />
        <button type="button" className="icon-btn" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut size={16} />
        </button>
      </header>

      <main id="contenido" className="content" ref={contenidoRef} tabIndex={-1}>
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="Principal">
        {secciones
          .flatMap((s) => s.enlaces)
          .map(({ to, end, icono: Icono, texto, contador }) => {
            const cuenta = contador ? contadores[contador] : 0;
            return (
              <NavLink key={to} to={to} end={end}>
                <Icono size={20} />
                {texto}
                {cuenta > 0 && <span className="tabbar-count num">{cuenta}</span>}
              </NavLink>
            );
          })}
      </nav>
    </div>
  );
}
