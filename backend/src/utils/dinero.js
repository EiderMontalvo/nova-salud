const ErrorApi = require('./error-api');

// Los importes se calculan en centavos con BigInt para evitar errores de redondeo.
function aCentavos(valor) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(valor))) throw new ErrorApi(409, 'Precio inválido en inventario');
  const [entero, decimal = ''] = String(valor).split('.');
  return BigInt(entero) * 100n + BigInt(decimal.padEnd(2, '0'));
}

function aImporte(centavos) {
  if (centavos < 0n || centavos > 9999999999n) throw new ErrorApi(409, 'El importe excede el límite permitido');
  return `${centavos / 100n}.${String(centavos % 100n).padStart(2, '0')}`;
}

module.exports = { aCentavos, aImporte };
