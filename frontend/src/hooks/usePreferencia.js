import { useEffect, useState } from 'react';

// Estado que se recuerda entre visitas. Si el navegador bloquea localStorage, funciona solo en memoria.
export function usePreferencia(clave, inicial) {
  const [valor, setValor] = useState(() => {
    try {
      const guardado = localStorage.getItem(clave);
      return guardado === null ? inicial : JSON.parse(guardado);
    } catch {
      return inicial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      // Sin almacenamiento disponible: la preferencia dura hasta recargar.
    }
  }, [clave, valor]);

  return [valor, setValor];
}
