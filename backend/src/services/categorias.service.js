const ApiError = require('../utils/api-error');

function category(row) {
  return { ...row, activo: Boolean(row.activo) };
}

function createCategoriasService(pool) {
  async function getById(id) {
    const [rows] = await pool.execute(
      'SELECT id_categoria, nombre, descripcion, activo FROM categorias WHERE id_categoria = ?', [id]
    );
    if (!rows[0]) throw new ApiError(404, 'Categoría no encontrada');
    return category(rows[0]);
  }

  return {
    getById,
    async list({ page, limit, search, activo }) {
      const filter = [Number(activo), `%${search}%`];
      const [[{ total }]] = await pool.execute(
        'SELECT COUNT(*) AS total FROM categorias WHERE activo = ? AND nombre LIKE ?', filter
      );
      const [rows] = await pool.execute(
        'SELECT id_categoria, nombre, descripcion, activo FROM categorias WHERE activo = ? AND nombre LIKE ? ORDER BY id_categoria DESC LIMIT ? OFFSET ?',
        [...filter, limit, (page - 1) * limit]
      );
      return { data: rows.map(category), pagination: { page, limit, total: Number(total), total_pages: Math.ceil(total / limit) } };
    },
    async create({ nombre, descripcion }) {
      const [result] = await pool.execute(
        'INSERT INTO categorias (nombre, descripcion, activo) VALUES (?, ?, 1)', [nombre, descripcion]
      );
      return getById(result.insertId);
    },
    async update(id, { nombre, descripcion, activo }) {
      await getById(id);
      await pool.execute(
        'UPDATE categorias SET nombre = ?, descripcion = ?, activo = COALESCE(?, activo) WHERE id_categoria = ?',
        [nombre, descripcion, activo === undefined ? null : Number(activo), id]
      );
      return getById(id);
    },
    async deactivate(id) {
      await getById(id);
      await pool.execute('UPDATE categorias SET activo = 0 WHERE id_categoria = ?', [id]);
    }
  };
}

module.exports = createCategoriasService;
