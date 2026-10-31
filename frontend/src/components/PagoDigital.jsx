import { soles } from '../lib/formato';

// Guía corta para cobrar sin efectivo; la venta solo se habilita cuando quien atiende confirma que el pago llegó.
const GUIAS = {
  YAPE: {
    pasos: [
      'Muestra el QR de Yape del negocio o dicta su número.',
      'Pide que yapeen el monto exacto.',
      'Revisa en el celular del negocio que llegó ese monto.',
    ],
    confirmar: (monto) => `Recibí el Yape de ${monto}`,
  },
  PLIN: {
    pasos: [
      'Muestra el QR de Plin del negocio o dicta su número.',
      'Pide que paguen el monto exacto desde su banco.',
      'Revisa en el celular del negocio que llegó ese monto.',
    ],
    confirmar: (monto) => `Recibí el Plin de ${monto}`,
  },
  TARJETA: {
    pasos: [
      'Ingresa el monto en el POS.',
      'El cliente inserta, desliza o acerca su tarjeta.',
      'Espera «Aprobado» y entrega el voucher.',
    ],
    confirmar: (monto) => `El POS aprobó el pago de ${monto}`,
  },
};

export default function PagoDigital({ metodo, monto, confirmado, onConfirmar, deshabilitado }) {
  const guia = GUIAS[metodo];
  const importe = soles(monto);

  return (
    <div className="cobro">
      <ol className="pago-pasos">
        {guia.pasos.map((paso) => (
          <li key={paso}>{paso}</li>
        ))}
      </ol>
      <label className="check pago-confirmar">
        <input
          type="checkbox"
          checked={confirmado}
          onChange={(e) => onConfirmar(e.target.checked)}
          disabled={deshabilitado}
        />
        {guia.confirmar(importe)}
      </label>
    </div>
  );
}
