const DIAS_POR_VENCER = 60;

export function soles(valor) {
  return `S/ ${Number(valor || 0).toFixed(2)}`;
}

// Las fechas llegan como 'YYYY-MM-DD'; se arman en hora local para no cambiar de día.
function aFecha(texto) {
  const [anio, mes, dia] = texto.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

export function fecha(texto) {
  if (!texto) return '—';
  return aFecha(texto).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function diasParaVencer(texto) {
  if (!texto) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((aFecha(texto) - hoy) / 86400000);
}

export function estadoVencimiento(texto) {
  const dias = diasParaVencer(texto);
  if (dias === null) return null;
  if (dias < 0) return { tipo: 'danger', texto: 'Vencido' };
  if (dias <= DIAS_POR_VENCER) return { tipo: 'warn', texto: textoPorVencer(dias) };
  return null;
}

function textoPorVencer(dias) {
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `Vence en ${dias} días`;
}

export function stockBajo(producto) {
  return producto.stock <= producto.stock_minimo;
}
