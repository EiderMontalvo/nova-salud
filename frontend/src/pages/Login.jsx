import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, LayoutGrid, ShoppingCart, TriangleAlert } from 'lucide-react';
import '@fontsource/parisienne/latin-400.css';
import { useAuth } from '../context/AuthContext';
import Marca, { Corazon } from '../components/Marca';
import Notice from '../components/Notice';
import ThemeToggle from '../components/ThemeToggle';
import { mensajeError } from '../lib/errores';
import './Login.css';

const PUNTOS = [
  { Icono: LayoutGrid, titulo: 'Catálogo al día', texto: 'precios, stock y fotos' },
  { Icono: ShoppingCart, titulo: 'Ventas en mostrador', texto: 'en pocos clics' },
  { Icono: TriangleAlert, titulo: 'Alertas de inventario', texto: 'stock bajo y vencimientos' },
];

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { login, usuario } = useAuth();
  const navigate = useNavigate();

  if (usuario) return <Navigate to="/" replace />;

  const ingresar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await login(correo, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err?.message === 'Credenciales inválidas'
          ? 'Correo o contraseña incorrectos.'
          : mensajeError(err, 'No se pudo iniciar sesión.')
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login">
      <ThemeToggle className="login-theme-toggle" />
      <section className="login-intro">
        <div className="login-intro-marca">
          <Marca grande claro />
          <span className="login-lema">Tu salud, nuestra prioridad</span>
        </div>

        <h1 className="login-titular">
          Cuidamos de ti,
          <br />
          en cada etapa de <em>tu vida.</em>
        </h1>
        <p className="login-bajada">Catálogo, ventas e inventario de la botica, de forma rápida, segura y sencilla.</p>

        <ul className="login-puntos">
          {PUNTOS.map(({ Icono, titulo, texto }) => (
            <li key={titulo}>
              <span className="login-punto-icono">
                <Icono size={20} />
              </span>
              <span>
                <strong>{titulo}</strong>
                <span>{texto}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="login-firma">
          Tu bienestar
          <br />
          comienza aquí
        </p>
      </section>

      <section className="login-lado">
        <form className="login-card" onSubmit={ingresar}>
          <div className="login-card-head">
            <Corazon className="login-card-corazon" />
            <h2>Nova Salud</h2>
            <p>Inicia sesión para continuar</p>
          </div>

          <Notice>{error}</Notice>

          <label className="field">
            <span>Correo electrónico</span>
            <span className="input-icono">
              <Mail size={18} />
              <input
                className="input"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="username"
                required
                autoFocus
              />
            </span>
          </label>

          <label className="field">
            <span>Contraseña</span>
            <span className="input-icono">
              <Lock size={18} />
              <input
                className="input"
                type={verPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="input-ojo"
                onClick={() => setVerPassword(!verPassword)}
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {verPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          <button type="submit" className="btn btn-primary btn-lg btn-block login-boton" disabled={enviando}>
            {enviando && <span className="spinner" />}
            {enviando ? 'Ingresando…' : 'Ingresar'}
            {!enviando && <ArrowRight size={18} />}
          </button>

          <div className="login-separador login-seguro">
            <span>
              <Lock size={13} /> Tus datos están protegidos
            </span>
          </div>
        </form>
      </section>
    </div>
  );
}
