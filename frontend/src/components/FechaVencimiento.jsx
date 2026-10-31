import { fecha, estadoVencimiento } from '../lib/formato';

// Fecha de vencimiento con su estado debajo («Vence en 5 días», «Vencido») como texto de apoyo.
export default function FechaVencimiento({ valor }) {
  const vence = estadoVencimiento(valor);

  return (
    <span className="vencimiento">
      <span className={vence ? `num texto-${vence.tipo}` : 'num'}>{fecha(valor)}</span>
      {vence && <span className={`vencimiento-estado texto-${vence.tipo}`}>{vence.texto}</span>}
    </span>
  );
}
