import { createContext, useContext, useEffect, useState } from 'react';

const VentaContext = createContext(null);

function leerGuardado() {
  try {
    return JSON.parse(sessionStorage.getItem('venta') || '[]');
  } catch {
    return [];
  }
}

export function VentaProvider({ children }) {
  const [items, setItems] = useState(leerGuardado);

  useEffect(() => {
    sessionStorage.setItem('venta', JSON.stringify(items));
  }, [items]);

  const agregar = (producto) => {
    setItems((actuales) => {
      const existente = actuales.find((i) => i.id_producto === producto.id_producto);
      if (existente) {
        return actuales.map((i) =>
          i.id_producto === producto.id_producto ? { ...i, cantidad: Math.min(i.cantidad + 1, producto.stock) } : i
        );
      }
      return [
        ...actuales,
        {
          id_producto: producto.id_producto,
          codigo: producto.codigo,
          nombre: producto.nombre,
          precio: producto.precio,
          imagen: producto.imagen,
          stock: producto.stock,
          cantidad: 1,
        },
      ];
    });
  };

  const cambiarCantidad = (id, cantidad) => {
    setItems((actuales) =>
      actuales.map((i) => (i.id_producto === id ? { ...i, cantidad: Math.max(1, Math.min(cantidad, i.stock)) } : i))
    );
  };

  const quitar = (id) => setItems((actuales) => actuales.filter((i) => i.id_producto !== id));
  const vaciar = () => setItems([]);

  const unidades = items.reduce((suma, i) => suma + i.cantidad, 0);
  const total = items.reduce((suma, i) => suma + Number(i.precio) * i.cantidad, 0);

  return (
    <VentaContext.Provider value={{ items, agregar, cambiarCantidad, quitar, vaciar, unidades, total }}>
      {children}
    </VentaContext.Provider>
  );
}

export function useVenta() {
  const ctx = useContext(VentaContext);
  if (!ctx) throw new Error('useVenta debe usarse dentro de VentaProvider');
  return ctx;
}
