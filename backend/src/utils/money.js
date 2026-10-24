const ApiError = require('./api-error');

function cents(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) throw new ApiError(409, 'Precio inválido en inventario');
  const [whole, decimal = ''] = String(value).split('.');
  return BigInt(whole) * 100n + BigInt(decimal.padEnd(2, '0'));
}

function amount(value) {
  if (value < 0n || value > 9999999999n) throw new ApiError(409, 'El importe excede el límite permitido');
  return `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
}

module.exports = { cents, amount };
