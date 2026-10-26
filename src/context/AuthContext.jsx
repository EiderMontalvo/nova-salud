import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    api('/auth/me')
      .then((res) => {
        if (res?.data) {
          setUsuario(res.data);
          sessionStorage.setItem('usuario', JSON.stringify(res.data));
        }
      })
      .catch(() => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('usuario');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (correo, password) => {
    const { data } = await api('/auth/login', {
      method: 'POST',
      body: { correo, password },
    });

    sessionStorage.setItem('token', data.token);
    sessionStorage.setItem('usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data.usuario;
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('usuario');
    setUsuario(null);
  };

  const isAdmin = usuario?.rol === 'ADMIN';
  const isVendedor = usuario?.rol === 'VENDEDOR';

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout, isAdmin, isVendedor }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
