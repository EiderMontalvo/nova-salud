const ApiError = require('../utils/api-error');
const fields = 'id_cliente, nombre, documento, telefono, correo, fecha_creacion';
function createClientesService(pool) {
  async function get(id) {
    const [rows] = await pool.execute(`SELECT ${fields} FROM clientes WHERE id_cliente = ?`, [id]);
    if (!rows[0]) throw new ApiError(404, 'Cliente no encontrado');
    return rows[0];
  }
  return {
    idField: 'id_cliente',
    get,
    async list({ page, limit, search }) {
      const values = [`%${search}%`, `%${search}%`];
      const where = '(nombre LIKE ? OR documento LIKE ?)';
      const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM clientes WHERE ${where}`, values);
      const [rows] = await pool.execute(`SELECT ${fields} FROM clientes WHERE ${where} ORDER BY id_cliente DESC LIMIT ? OFFSET ?`, [...values, limit, (page - 1) * limit]);
      return { data: rows, pagination: { page, limit, total: Number(total), total_pages: Math.ceil(total / limit) } };
    },
    async create(data) {
      try {
        const [result] = await pool.execute('INSERT INTO clientes (nombre, documento, telefono, correo) VALUES (?, ?, ?, ?)',
          [data.nombre, data.documento, data.telefono, data.correo]);
        return get(result.insertId);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'Ya existe un cliente con ese documento');
        throw error;
      }
    },
    async update(id, data) {
      await get(id);
      try {
        await pool.execute('UPDATE clientes SET nombre = ?, documento = ?, telefono = ?, correo = ? WHERE id_cliente = ?',
          [data.nombre, data.documento, data.telefono, data.correo, id]);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'Ya existe un cliente con ese documento');
        throw error;
      }
      return get(id);
    }
  };
}
module.exports = createClientesService;
