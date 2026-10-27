import { useEffect, useState } from 'react';

export function useDebounce(valor, espera = 300) {
  const [diferido, setDiferido] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setDiferido(valor), espera);
    return () => clearTimeout(temporizador);
  }, [valor, espera]);

  return diferido;
}
