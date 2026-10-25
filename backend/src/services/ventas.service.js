const { pool } = require('../config/database');
const ErrorApi = require('../utils/error-api');
const paginacion = require('../utils/paginacion');
const enTransaccion = require('../utils/transaccion');
const { aCentavos, aImporte } = require('../utils/dinero');
const { ahora, hoy } = require('../utils/hora-lima');

const columnas = "id_venta, id_usuario, id_cliente, DATE_FORMAT(fecha, '%Y-%m-%dT%H:%i:%s-05:00') AS fecha, total, metodo_pago, estado";
const ADMIN = { rol: 'ADMIN' };

async function obtener(id, usuario, conexion = pool) {
  const [filas] = await conexion.execute(`SELECT ${columnas} FROM ventas WHERE id_venta = ?`, [id]);
  if (!filas[0]) throw new ErrorApi(404, 'Venta no encontrada');
  if (usuario.rol !== 'ADMIN' && filas[0].id_usuario !== usuario.id_usuario) throw new ErrorApi(403, 'Solo puedes consultar tus propias ventas');
  const [detalles] = await conexion.execute(
    'SELECT d.id_detalle, d.id_producto, p.codigo, p.nombre, d.cantidad, d.precio_unitario, d.subtotal FROM detalle_ventas d JOIN productos p ON p.id_producto = d.id_producto WHERE d.id_venta = ? ORDER BY d.id_detalle',
    [id]
  );
  return { ...filas[0], detalles };
}

// Un VENDEDOR solo ve sus propias ventas; ADMIN puede filtrar por cualquier usuario.
function armarFiltros(consulta, usuario) {
  const condiciones = [];
  const valores = [];
  if (usuario.rol !== 'ADMIN') {
    if (consulta.id_usuario && consulta.id_usuario !== usuario.id_usuario) throw new ErrorApi(403, 'Solo puedes consultar tus propias ventas');
    condiciones.push('id_usuario = ?'); valores.push(usuario.id_usuario);
  } else if (consulta.id_usuario) {
    condiciones.push('id_usuario = ?'); valores.push(consulta.id_usuario);
  }
  if (consulta.id_cliente) { condiciones.push('id_cliente = ?'); valores.push(consulta.id_cliente); }
  if (consulta.estado) { condiciones.push('estado = ?'); valores.push(consulta.estado); }
  if (consulta.desde) { condiciones.push('fecha >= ?'); valores.push(`${consulta.desde} 00:00:00`); }
  if (consulta.hasta) { condiciones.push('fecha <= ?'); valores.push(`${consulta.hasta} 23:59:59`); }
  return { where: condiciones.length ? condiciones.join(' AND ') : '1=1', valores };
}

async function listar(consulta, usuario) {
  const { where, valores } = armarFiltros(consulta, usuario);
  const { page, limit } = consulta;
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM ventas WHERE ${where}`, valores);
  const [filas] = await pool.execute(
    `SELECT ${columnas} FROM ventas WHERE ${where} ORDER BY id_venta DESC LIMIT ? OFFSET ?`,
    [...valores, limit, (page - 1) * limit]
  );
  return { data: filas, pagination: paginacion(page, limit, total) };
}

async function registrar(datos, usuario) {
  return enTransaccion(async conexion => {
    const [usuarios] = await conexion.execute('SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND activo = 1 LOCK IN SHARE MODE', [usuario.id_usuario]);
    if (!usuarios.length) throw new ErrorApi(401, 'Usuario inactivo o inexistente');
    if (datos.id_cliente !== null) {
      const [clientes] = await conexion.execute('SELECT id_cliente FROM clientes WHERE id_cliente = ? LOCK IN SHARE MODE', [datos.id_cliente]);
      if (!clientes.length) throw new ErrorApi(400, 'El cliente indicado no existe');
    }

    const items = [...datos.detalles].sort((a, b) => a.id_producto - b.id_producto);
    const ids = items.map(item => item.id_producto);
    const marcadores = ids.map(() => '?').join(',');
    // Bloquear en orden de id impide que dos ventas descuenten las mismas existencias.
    const [productos] = await conexion.execute(
      `SELECT id_producto, precio, stock, activo, DATE_FORMAT(fecha_vencimiento, '%Y-%m-%d') AS fecha_vencimiento FROM productos WHERE id_producto IN (${marcadores}) ORDER BY id_producto FOR UPDATE`,
      ids
    );
    const porId = new Map(productos.map(producto => [producto.id_producto, producto]));
    const dia = hoy();
    let total = 0n;
    const detalles = items.map(item => {
      const producto = porId.get(item.id_producto);
      if (!producto) throw new ErrorApi(404, `Producto ${item.id_producto} no encontrado`);
      if (!producto.activo) throw new ErrorApi(409, `Producto ${item.id_producto} inactivo`);
      if (producto.fecha_vencimiento && producto.fecha_vencimiento < dia) throw new ErrorApi(409, `Producto ${item.id_producto} vencido`);
      if (producto.stock < item.cantidad) throw new ErrorApi(409, `Stock insuficiente para el producto ${item.id_producto}`);
      const precio = aCentavos(producto.precio);
      const subtotal = precio * BigInt(item.cantidad);
      total += subtotal;
      return { ...item, precio_unitario: aImporte(precio), subtotal: aImporte(subtotal) };
    });

    const [venta] = await conexion.execute(
      "INSERT INTO ventas (id_usuario, id_cliente, fecha, total, metodo_pago, estado) VALUES (?, ?, ?, ?, ?, 'COMPLETADA')",
      [usuario.id_usuario, datos.id_cliente, ahora(), aImporte(total), datos.metodo_pago]
    );
    for (const item of detalles) {
      await conexion.execute('INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
        [venta.insertId, item.id_producto, item.cantidad, item.precio_unitario, item.subtotal]);
      const [resultado] = await conexion.execute('UPDATE productos SET stock = stock - ? WHERE id_producto = ? AND stock >= ?',
        [item.cantidad, item.id_producto, item.cantidad]);
      if (resultado.affectedRows !== 1) throw new ErrorApi(409, 'Stock insuficiente');
    }

    const [alertas] = await conexion.execute(
      `SELECT id_producto, codigo, nombre, stock, stock_minimo FROM productos WHERE id_producto IN (${marcadores}) AND stock <= stock_minimo ORDER BY id_producto`,
      ids
    );
    return { ...(await obtener(venta.insertId, usuario, conexion)), alertas_stock: alertas };
  });
}

async function anular(id, usuario) {
  return enTransaccion(async conexion => {
    const [filas] = await conexion.execute('SELECT id_venta, estado FROM ventas WHERE id_venta = ? FOR UPDATE', [id]);
    if (!filas.length) throw new ErrorApi(404, 'Venta no encontrada');
    if (filas[0].estado !== 'COMPLETADA') throw new ErrorApi(409, 'La venta ya está anulada');
    const [detalles] = await conexion.execute(
      'SELECT id_producto, SUM(cantidad) AS cantidad FROM detalle_ventas WHERE id_venta = ? GROUP BY id_producto ORDER BY id_producto',
      [id]
    );
    for (const detalle of detalles) {
      const [productos] = await conexion.execute('SELECT stock FROM productos WHERE id_producto = ? FOR UPDATE', [detalle.id_producto]);
      const cantidad = Number(detalle.cantidad);
      if (!productos.length || !Number.isSafeInteger(cantidad) || cantidad <= 0 || productos[0].stock + cantidad > 2147483647) {
        throw new ErrorApi(409, 'No se puede restaurar el stock de esta venta');
      }
      await conexion.execute('UPDATE productos SET stock = stock + ? WHERE id_producto = ?', [cantidad, detalle.id_producto]);
    }
    await conexion.execute("UPDATE ventas SET estado = 'ANULADA' WHERE id_venta = ?", [id]);
    return obtener(id, usuario, conexion);
  });
}

async function generarReporte(consulta) {
  const { where, valores } = armarFiltros(consulta, ADMIN);
  const [[resumen]] = await pool.execute(`SELECT
    COUNT(*) AS cantidad_ventas,
    COALESCE(SUM(CASE WHEN estado = 'COMPLETADA' THEN 1 ELSE 0 END), 0) AS completadas,
    COALESCE(SUM(CASE WHEN estado = 'ANULADA' THEN 1 ELSE 0 END), 0) AS anuladas,
    COALESCE(SUM(CASE WHEN estado = 'COMPLETADA' THEN total ELSE 0 END), 0) AS ingresos
    FROM ventas WHERE ${where}`, valores);
  const historial = await listar(consulta, ADMIN);
  return {
    ...historial,
    resumen: {
      cantidad_ventas: Number(resumen.cantidad_ventas),
      completadas: Number(resumen.completadas),
      anuladas: Number(resumen.anuladas),
      ingresos: resumen.ingresos
    },
    periodo: { desde: consulta.desde, hasta: consulta.hasta, zona_horaria: 'America/Lima' }
  };
}

module.exports = { obtener: (id, usuario) => obtener(id, usuario), listar, registrar, anular, generarReporte };
