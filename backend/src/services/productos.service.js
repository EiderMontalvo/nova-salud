const ApiError = require('../utils/api-error');

// DATE_FORMAT evita que el vencimiento cambie de día al serializar zonas horarias.
const columns = `id_producto, id_categoria, codigo, nombre, descripcion, imagen,
  precio, stock, stock_minimo, DATE_FORMAT(fecha_vencimiento, '%Y-%m-%d') AS fecha_vencimiento,
  activo, fecha_creacion`;

function product(row) {
  return { ...row, activo: Boolean(row.activo) };
}

function createProductosService(pool) {
  async function getById(id) {
    const [rows] = await pool.execute(`SELECT ${columns} FROM productos WHERE id_producto = ?`, [id]);
    if (!rows[0]) throw new ApiError(404, 'Producto no encontrado');
    return product(rows[0]);
  }

  async function checkCategory(id) {
    const [rows] = await pool.execute('SELECT id_categoria FROM categorias WHERE id_categoria = ?', [id]);
    if (!rows.length) throw new ApiError(400, 'La categoría indicada no existe');
  }

  async function write(sql, values) {
    try {
      const [result] = await pool.execute(sql, values);
      return result;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'Ya existe un producto con ese código');
      if (error.code === 'ER_NO_REFERENCED_ROW_2') throw new ApiError(400, 'La categoría indicada no existe');
      throw error;
    }
  }

  function values(data) {
    return [data.id_categoria, data.codigo, data.nombre, data.descripcion, data.imagen,
      data.precio, data.stock, data.stock_minimo, data.fecha_vencimiento];
  }

  return {
    getById,
    async list({ page, limit, search, activo, id_categoria }) {
      const conditions = ['activo = ?', '(nombre LIKE ? OR codigo LIKE ?)'];
      const filter = [Number(activo), `%${search}%`, `%${search}%`];
      if (id_categoria !== undefined) {
        conditions.push('id_categoria = ?');
        filter.push(id_categoria);
      }
      const where = conditions.join(' AND ');
      const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM productos WHERE ${where}`, filter);
      const [rows] = await pool.execute(
        `SELECT ${columns} FROM productos WHERE ${where} ORDER BY id_producto DESC LIMIT ? OFFSET ?`,
        [...filter, limit, (page - 1) * limit]
      );
      return { data: rows.map(product), pagination: { page, limit, total: Number(total), total_pages: Math.ceil(total / limit) } };
    },
    async create(data) {
      await checkCategory(data.id_categoria);
      const result = await write(
        'INSERT INTO productos (id_categoria, codigo, nombre, descripcion, imagen, precio, stock, stock_minimo, fecha_vencimiento, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
        values(data)
      );
      return getById(result.insertId);
    },
    async update(id, data) {
      await getById(id);
      await checkCategory(data.id_categoria);
      await write(
        'UPDATE productos SET id_categoria = ?, codigo = ?, nombre = ?, descripcion = ?, imagen = ?, precio = ?, stock = ?, stock_minimo = ?, fecha_vencimiento = ?, activo = COALESCE(?, activo) WHERE id_producto = ?',
        [...values(data), data.activo === undefined ? null : Number(data.activo), id]
      );
      return getById(id);
    },
    async deactivate(id) {
      await getById(id);
      await pool.execute('UPDATE productos SET activo = 0 WHERE id_producto = ?', [id]);
    }
  };
}

module.exports = createProductosService;
