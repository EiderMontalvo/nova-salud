const ApiError = require('../utils/api-error');
const transaction = require('../utils/transaction');
const { cents, amount } = require('../utils/money');
const { now, today } = require('../utils/business-time');

const header = "id_venta, id_usuario, id_cliente, DATE_FORMAT(fecha, '%Y-%m-%dT%H:%i:%s-05:00') AS fecha, total, metodo_pago, estado";

function createVentasService(pool) {
  async function get(id, actor, connection = pool) {
    const [rows] = await connection.execute(`SELECT ${header} FROM ventas WHERE id_venta = ?`, [id]);
    if (!rows[0]) throw new ApiError(404, 'Venta no encontrada');
    if (actor.rol !== 'ADMIN' && rows[0].id_usuario !== actor.id_usuario) throw new ApiError(403, 'Solo puedes consultar tus propias ventas');
    const [details] = await connection.execute('SELECT d.id_detalle, d.id_producto, p.codigo, p.nombre, d.cantidad, d.precio_unitario, d.subtotal FROM detalle_ventas d JOIN productos p ON p.id_producto = d.id_producto WHERE d.id_venta = ? ORDER BY d.id_detalle', [id]);
    return { ...rows[0], detalles: details };
  }

  function filters(query, actor) {
    const conditions = [];
    const values = [];
    if (actor.rol !== 'ADMIN') {
      if (query.id_usuario && query.id_usuario !== actor.id_usuario) throw new ApiError(403, 'Solo puedes consultar tus propias ventas');
      conditions.push('id_usuario = ?'); values.push(actor.id_usuario);
    } else if (query.id_usuario) { conditions.push('id_usuario = ?'); values.push(query.id_usuario); }
    if (query.id_cliente) { conditions.push('id_cliente = ?'); values.push(query.id_cliente); }
    if (query.estado) { conditions.push('estado = ?'); values.push(query.estado); }
    if (query.desde) { conditions.push('fecha >= ?'); values.push(`${query.desde} 00:00:00`); }
    if (query.hasta) { conditions.push('fecha <= ?'); values.push(`${query.hasta} 23:59:59`); }
    return { where: conditions.length ? conditions.join(' AND ') : '1=1', values };
  }

  return {
    idField: 'id_venta',
    get,
    async list(query, actor) {
      const { where, values } = filters(query, actor);
      const { page, limit } = query;
      const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM ventas WHERE ${where}`, values);
      const [rows] = await pool.execute(`SELECT ${header} FROM ventas WHERE ${where} ORDER BY id_venta DESC LIMIT ? OFFSET ?`, [...values, limit, (page - 1) * limit]);
      return { data: rows, pagination: { page, limit, total: Number(total), total_pages: Math.ceil(total / limit) } };
    },
    async create(data, actor) {
      return transaction(pool, async connection => {
        const [users] = await connection.execute('SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND activo = 1 LOCK IN SHARE MODE', [actor.id_usuario]);
        if (!users.length) throw new ApiError(401, 'Usuario inactivo o inexistente');
        if (data.id_cliente !== null) {
          const [clients] = await connection.execute('SELECT id_cliente FROM clientes WHERE id_cliente = ? LOCK IN SHARE MODE', [data.id_cliente]);
          if (!clients.length) throw new ApiError(400, 'El cliente indicado no existe');
        }
        const items = [...data.detalles].sort((a, b) => a.id_producto - b.id_producto);
        const placeholders = items.map(() => '?').join(',');
        // Bloquear en orden de id impide que dos ventas descuenten las mismas existencias.
        const [products] = await connection.execute(`SELECT id_producto, precio, stock, activo, DATE_FORMAT(fecha_vencimiento, '%Y-%m-%d') AS fecha_vencimiento FROM productos WHERE id_producto IN (${placeholders}) ORDER BY id_producto FOR UPDATE`, items.map(item => item.id_producto));
        const byId = new Map(products.map(product => [product.id_producto, product]));
        const day = today();
        let total = 0n;
        const details = items.map(item => {
          const product = byId.get(item.id_producto);
          if (!product) throw new ApiError(404, `Producto ${item.id_producto} no encontrado`);
          if (!product.activo) throw new ApiError(409, `Producto ${item.id_producto} inactivo`);
          if (product.fecha_vencimiento && product.fecha_vencimiento < day) throw new ApiError(409, `Producto ${item.id_producto} vencido`);
          if (product.stock < item.cantidad) throw new ApiError(409, `Stock insuficiente para el producto ${item.id_producto}`);
          const price = cents(product.precio);
          const subtotal = price * BigInt(item.cantidad);
          total += subtotal;
          return { ...item, precio_unitario: amount(price), subtotal: amount(subtotal) };
        });
        const totalAmount = amount(total);
        const [sale] = await connection.execute("INSERT INTO ventas (id_usuario, id_cliente, fecha, total, metodo_pago, estado) VALUES (?, ?, ?, ?, ?, 'COMPLETADA')",
          [actor.id_usuario, data.id_cliente, now(), totalAmount, data.metodo_pago]);
        for (const item of details) {
          await connection.execute('INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
            [sale.insertId, item.id_producto, item.cantidad, item.precio_unitario, item.subtotal]);
          const [result] = await connection.execute('UPDATE productos SET stock = stock - ? WHERE id_producto = ? AND stock >= ?', [item.cantidad, item.id_producto, item.cantidad]);
          if (result.affectedRows !== 1) throw new ApiError(409, 'Stock insuficiente');
        }
        return get(sale.insertId, actor, connection);
      });
    },
    async cancel(id, actor) {
      return transaction(pool, async connection => {
        const [rows] = await connection.execute('SELECT id_venta, estado FROM ventas WHERE id_venta = ? FOR UPDATE', [id]);
        if (!rows.length) throw new ApiError(404, 'Venta no encontrada');
        if (rows[0].estado !== 'COMPLETADA') throw new ApiError(409, 'La venta ya está anulada');
        const [details] = await connection.execute('SELECT id_producto, SUM(cantidad) AS cantidad FROM detalle_ventas WHERE id_venta = ? GROUP BY id_producto ORDER BY id_producto', [id]);
        for (const detail of details) {
          const [products] = await connection.execute('SELECT stock FROM productos WHERE id_producto = ? FOR UPDATE', [detail.id_producto]);
          const quantity = Number(detail.cantidad);
          if (!products.length || !Number.isSafeInteger(quantity) || quantity <= 0 || products[0].stock + quantity > 2147483647) {
            throw new ApiError(409, 'No se puede restaurar el stock de esta venta');
          }
          await connection.execute('UPDATE productos SET stock = stock + ? WHERE id_producto = ?', [quantity, detail.id_producto]);
        }
        await connection.execute("UPDATE ventas SET estado = 'ANULADA' WHERE id_venta = ?", [id]);
        return get(id, actor, connection);
      });
    },
    async report(query) {
      const { where, values } = filters(query, { rol: 'ADMIN' });
      const [[summary]] = await pool.execute(`SELECT COUNT(*) AS cantidad_ventas, COALESCE(SUM(CASE WHEN estado = 'COMPLETADA' THEN 1 ELSE 0 END), 0) AS completadas, COALESCE(SUM(CASE WHEN estado = 'ANULADA' THEN 1 ELSE 0 END), 0) AS anuladas, COALESCE(SUM(CASE WHEN estado = 'COMPLETADA' THEN total ELSE 0 END), 0) AS ingresos FROM ventas WHERE ${where}`, values);
      const result = await this.list(query, { rol: 'ADMIN' });
      return { ...result, resumen: { cantidad_ventas: Number(summary.cantidad_ventas), completadas: Number(summary.completadas), anuladas: Number(summary.anuladas), ingresos: summary.ingresos }, periodo: { desde: query.desde, hasta: query.hasta, zona_horaria: 'America/Lima' } };
    }
  };
}
module.exports = createVentasService;
