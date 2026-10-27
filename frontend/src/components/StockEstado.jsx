// Stock como texto: cuántas unidades quedan y si ya está en o por debajo del mínimo.
export default function StockEstado({ stock, minimo, mostrarMinimo = true }) {
  const agotado = stock === 0;
  const bajo = stock <= minimo;
  const clase = ['stock', bajo && 'is-low', agotado && 'is-out'].filter(Boolean).join(' ');
  const texto = agotado ? 'Agotado' : `${stock} ${stock === 1 ? 'unidad' : 'unidades'}`;

  return (
    <span className={clase}>
      <span className="stock-qty num">{texto}</span>
      {mostrarMinimo && <span className="stock-min num">{bajo && !agotado ? `reponer · mín. ${minimo}` : `mín. ${minimo}`}</span>}
    </span>
  );
}
