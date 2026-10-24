const { today } = require('../utils/business-time');

function createInventarioService(pool, products) {
  async function alert(view, query) {
    const { page, limit, search } = query;
    const values = [`%${search}%`, `%${search}%`];
    const where = '(nombre LIKE ? OR codigo LIKE ?)';
    const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM ${view} WHERE ${where}`, values);
    const columns = view === 'vista_stock_bajo'
      ? 'id_producto, codigo, nombre, imagen, stock, stock_minimo, categoria'
      : "id_producto, codigo, nombre, imagen, stock, DATE_FORMAT(fecha_vencimiento, '%Y-%m-%d') AS fecha_vencimiento, dias_restantes";
    const [rows] = await pool.execute(`SELECT ${columns} FROM ${view} WHERE ${where} ORDER BY id_producto DESC LIMIT ? OFFSET ?`, [...values, limit, (page - 1) * limit]);
    return { data: rows, pagination: { page, limit, total: Number(total), total_pages: Math.ceil(total / limit) } };
  }
  return {
    list: query => products.list(query),
    low: query => alert('vista_stock_bajo', query),
    expiring: query => alert('vista_productos_por_vencer', query),
    async summary() {
      const day = today();
      const [[counts]] = await pool.execute(`SELECT
        (SELECT COUNT(*) FROM productos WHERE activo = 1) AS productos_activos,
        (SELECT COUNT(*) FROM vista_stock_bajo) AS stock_bajo,
        (SELECT COUNT(*) FROM vista_productos_por_vencer) AS por_vencer`);
      const [[sales]] = await pool.execute("SELECT COUNT(*) AS ventas_del_dia, COALESCE(SUM(total), 0) AS ingresos_del_dia FROM ventas WHERE estado = 'COMPLETADA' AND fecha >= ? AND fecha < DATE_ADD(?, INTERVAL 1 DAY)", [`${day} 00:00:00`, `${day} 00:00:00`]);
      return { productos_activos: Number(counts.productos_activos), stock_bajo: Number(counts.stock_bajo), por_vencer: Number(counts.por_vencer), ventas_del_dia: Number(sales.ventas_del_dia), ingresos_del_dia: sales.ingresos_del_dia, fecha: day, zona_horaria: 'America/Lima' };
    }
  };
}
module.exports = createInventarioService;
