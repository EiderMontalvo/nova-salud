import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
  const { usuario, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">💊</span>
          <span className="brand-text">Nova Salud</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <span>🏠</span> Catálogo
          </NavLink>
          <NavLink to="/ventas" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <span>🛒</span> Ventas
          </NavLink>
          <NavLink to="/stock-bajo" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <span>⚠️</span> Stock bajo
          </NavLink>

          {isAdmin && (
            <>
              <div className="nav-section">Administración</div>
              <NavLink to="/admin/productos" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                <span>📦</span> Productos
              </NavLink>
              <NavLink to="/admin/categorias" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                <span>🏷️</span> Categorías
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-name">{usuario?.nombre}</div>
            <div className="user-role">{usuario?.rol}</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
