import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Catalogo from './pages/Catalogo';
import ProductoDetalle from './pages/ProductoDetalle';
import AdminProductos from './pages/AdminProductos';
import AdminCategorias from './pages/AdminCategorias';
import Ventas from './pages/Ventas';
import StockBajo from './pages/StockBajo';

function RutaProtegida({ children, soloAdmin = false }) {
  const { usuario, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="boot" aria-busy="true">
        <span className="spinner" />
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;
  if (soloAdmin && !isAdmin) return <Navigate to="/" replace />;

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <RutaProtegida>
            <Layout />
          </RutaProtegida>
        }
      >
        <Route index element={<Catalogo />} />
        <Route path="producto/:id" element={<ProductoDetalle />} />
        <Route path="ventas" element={<Ventas />} />
        <Route path="stock-bajo" element={<StockBajo />} />
        <Route
          path="admin/productos"
          element={
            <RutaProtegida soloAdmin>
              <AdminProductos />
            </RutaProtegida>
          }
        />
        <Route
          path="admin/categorias"
          element={
            <RutaProtegida soloAdmin>
              <AdminCategorias />
            </RutaProtegida>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
