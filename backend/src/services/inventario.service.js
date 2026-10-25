const { pool } = require('../config/database');
const paginacion = require('../utils/paginacion');
const { hoy } = require('../utils/hora-lima');

async function listarVista(vista, columnas, { page, limit, search }) {
  const valores = [`%${search}%`, `%${search}%`];
  const where = '(nombre LIKE ? OR codigo LIKE ?)';
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM ${vista} WHERE ${where}`, valores);
  const [filas] = await pool.execute(
    `SELECT ${columnas} FROM ${vista} WHERE ${where} ORDER BY id_producto DESC LIMIT ? OFFSET ?`,
    [...valores, limit, (page - 1) * limit]
  );
  return { data: filas, pagination: paginacion(page, limit, total) };
}

function listarStockBajo(consulta) {
  return listarVista('vista_stock_bajo', 'id_producto, codigo, nombre, imagen, stock, stock_minimo, categoria', consulta);
}

function listarPorVencer(consulta) {
  return listarVista('vista_productos_por_vencer',
    "id_producto, codigo, nombre, imagen, stock, DATE_FORMAT(fecha_vencimiento, '%Y-%m-%d') AS fecha_vencimiento, dias_restantes",
    consulta);
}

async function obtenerResumen() {
  const dia = hoy();
  const [[conteos]] = await pool.execute(`SELECT
    (SELECT COUNT(*) FROM productos WHERE activo = 1) AS productos_activos,
    (SELECT COUNT(*) FROM vista_stock_bajo) AS stock_bajo,
    (SELECT COUNT(*) FROM vista_productos_por_vencer) AS por_vencer`);
  const [[ventas]] = await pool.execute(
    "SELECT COUNT(*) AS ventas_del_dia, COALESCE(SUM(total), 0) AS ingresos_del_dia FROM ventas WHERE estado = 'COMPLETADA' AND fecha >= ? AND fecha < DATE_ADD(?, INTERVAL 1 DAY)",
    [`${dia} 00:00:00`, `${dia} 00:00:00`]
  );
  return {
    productos_activos: Number(conteos.productos_activos),
    stock_bajo: Number(conteos.stock_bajo),
    por_vencer: Number(conteos.por_vencer),
    ventas_del_dia: Number(ventas.ventas_del_dia),
    ingresos_del_dia: ventas.ingresos_del_dia,
    fecha: dia,
    zona_horaria: 'America/Lima'
  };
}

module.exports = { listarStockBajo, listarPorVencer, obtenerResumen };
