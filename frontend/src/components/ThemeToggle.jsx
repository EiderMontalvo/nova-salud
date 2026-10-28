import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ showLabel = false, className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const siguienteTema = theme === 'light' ? 'oscuro' : 'claro';
  const Icono = theme === 'light' ? Moon : Sun;

  return (
    <button
      type="button"
      className={`theme-toggle ${showLabel ? 'theme-toggle-labeled' : 'icon-btn'} ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={`Cambiar a modo ${siguienteTema}`}
      title={`Cambiar a modo ${siguienteTema}`}
    >
      <Icono size={18} aria-hidden="true" />
      {showLabel && <span>Modo {siguienteTema}</span>}
    </button>
  );
}
