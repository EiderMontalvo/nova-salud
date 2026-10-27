import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, ShoppingCart, TriangleAlert, Package, Tags, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVenta } from '../context/VentaContext';
import { api } from '../api';
import Marca from './Marca';
import './Layout.css';

const enlaceClase = ({ isActive }) => (isActive ? 'rail-link active' : 'rail-link');

export default function Layout() {
  const { usuario, logout, isAdmin } = useAuth();
  const { unidades } = useVenta();
  const navigate = useNavigate();
  const location = useLocation();
  const [alertas, setAlertas] = useState({ stock: null, vencer: null });

  // Se recalcula al navegar para que una venta o una edición se refleje en los contadores.
  useEffect(() => {
    Promise.all([api('/inventario/stock-bajo?limit=1'), api('/inventario/por-vencer?limit=1')])
      .then(([stock, vencer]) =>
        setAlertas({ stock: stock?.pagination?.total ?? 0, vencer: vencer?.pagination?.total ?? 0 })
      )
      .catch(() => {});
  }, [location.pathname]);

  const salir = () => {
    logout();
    navigate('/login');
  };

  const totalAlertas = (alertas.stock || 0) + (alertas.vencer || 0);

  return (
    <div className="shell">
      <aside className="rail">
        <div className="rail-brand">
          <Marca claro />
        </div>

        <nav className="rail-nav" aria-label="Principal">
          <NavLink to="/" end className={enlaceClase}>
            <LayoutGrid size={18} /> Catálogo
          </NavLink>
          <NavLink to="/ventas" className={enlaceClase}>
            <ShoppingCart size={18} /> Vender
            {unidades > 0 && <span className="rail-count num">{unidades}</span>}
          </NavLink>
          <NavLink to="/stock-bajo" className={enlaceClase}>
            <TriangleAlert size={18} /> Alertas
            <span className="rail-counts">
              {alertas.stock > 0 && (
                <span className="rail-count rail-count-danger num" title="Stock bajo">
                  {alertas.stock}
                </span>
              )}
              {alertas.vencer > 0 && (
                <span className="rail-count rail-count-warn num" title="Por vencer">
                  {alertas.vencer}
                </span>
              )}
            </span>
          </NavLink>

          {isAdmin && (
            <>
              <div className="rail-section">Administración</div>
              <NavLink to="/admin/productos" className={enlaceClase}>
                <Package size={18} /> Productos
              </NavLink>
              <NavLink to="/admin/categorias" className={enlaceClase}>
                <Tags size={18} /> Categorías
              </NavLink>
            </>
          )}
        </nav>

        <div className="rail-user">
          <div>
            <div className="rail-user-name">{usuario?.nombre}</div>
            <div className="rail-user-role">{usuario?.rol === 'ADMIN' ? 'Administrador' : 'Vendedor'}</div>
          </div>
          <button className="rail-salir" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <header className="topbar">
        <Marca />
        <button className="icon-btn" onClick={salir} aria-label="Cerrar sesión">
          <LogOut size={16} />
        </button>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="Principal">
        <NavLink to="/" end>
          <LayoutGrid size={20} />
          Catálogo
        </NavLink>
        <NavLink to="/ventas">
          <ShoppingCart size={20} />
          Vender
          {unidades > 0 && <span className="tabbar-dot num">{unidades}</span>}
        </NavLink>
        <NavLink to="/stock-bajo">
          <TriangleAlert size={20} />
          Alertas
          {totalAlertas > 0 && <span className="tabbar-dot tabbar-dot-neutral num">{totalAlertas}</span>}
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin/productos">
            <Package size={20} />
            Productos
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/admin/categorias">
            <Tags size={20} />
            Categorías
          </NavLink>
        )}
      </nav>
    </div>
  );
}
