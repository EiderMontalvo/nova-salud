import { useCallback, useEffect, useMemo, useState } from 'react';
import { traerTodos } from '../api';
import { mensajeError } from '../lib/errores';

// Catálogo activo completo (productos + categorías), compartido por el catálogo y la venta.
export function useCatalogo() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [listaProductos, listaCategorias] = await Promise.all([traerTodos('/productos'), traerTodos('/categorias')]);
      setProductos(listaProductos);
      setCategorias(listaCategorias);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cargar el catálogo.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombreCategoria = useMemo(
    () => Object.fromEntries(categorias.map((c) => [c.id_categoria, c.nombre])),
    [categorias]
  );

  return { productos, categorias, nombreCategoria, cargando, error, recargar: cargar };
}

export function filtrarProductos(productos, texto) {
  const consulta = texto.trim().toLowerCase();
  if (!consulta) return productos;
  return productos.filter(
    (p) => p.nombre.toLowerCase().includes(consulta) || p.codigo.toLowerCase().includes(consulta)
  );
}
