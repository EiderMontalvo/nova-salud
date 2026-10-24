const bcrypt = require('bcrypt');
const ApiError = require('../utils/api-error');
const transaction = require('../utils/transaction');

const fields = 'id_usuario, nombre, correo, rol, activo, fecha_creacion';
const serialize = row => ({ ...row, activo: Boolean(row.activo) });

function createUsuariosService(pool) {
  async function get(id, connection = pool) {
    const [rows] = await connection.execute(`SELECT ${fields} FROM usuarios WHERE id_usuario = ?`, [id]);
    if (!rows[0]) throw new ApiError(404, 'Usuario no encontrado');
    return serialize(rows[0]);
  }

  async function update(id, data, actorId) {
    const hash = data.password ? await bcrypt.hash(data.password, 12) : null;
    return transaction(pool, async connection => {
      // El orden común de bloqueo evita desactivar simultáneamente a todos los administradores.
      const [admins] = await connection.execute("SELECT id_usuario FROM usuarios WHERE rol = 'ADMIN' AND activo = 1 ORDER BY id_usuario FOR UPDATE");
      const [rows] = await connection.execute(`SELECT ${fields} FROM usuarios WHERE id_usuario = ? FOR UPDATE`, [id]);
      if (!rows[0]) throw new ApiError(404, 'Usuario no encontrado');
      const target = rows[0];
      const role = data.rol ?? target.rol;
      const active = data.activo ?? Boolean(target.activo);
      if (actorId === id && !active) throw new ApiError(409, 'No puedes desactivar tu propia cuenta');
      if (target.rol === 'ADMIN' && target.activo && (role !== 'ADMIN' || !active) && admins.length <= 1) {
        throw new ApiError(409, 'Debe existir al menos un administrador activo');
      }
      await connection.execute('UPDATE usuarios SET nombre = ?, correo = ?, rol = ?, activo = ?, password = COALESCE(?, password) WHERE id_usuario = ?',
        [data.nombre ?? target.nombre, data.correo ?? target.correo, role, Number(active), hash, id]);
      return get(id, connection);
    });
  }

  return {
    idField: 'id_usuario',
    get: id => get(id),
    async list({ page, limit, search, activo }) {
      const where = '(nombre LIKE ? OR correo LIKE ?)' + (activo === undefined ? '' : ' AND activo = ?');
      const values = [`%${search}%`, `%${search}%`, ...(activo === undefined ? [] : [Number(activo)])];
      const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM usuarios WHERE ${where}`, values);
      const [rows] = await pool.execute(`SELECT ${fields} FROM usuarios WHERE ${where} ORDER BY id_usuario DESC LIMIT ? OFFSET ?`, [...values, limit, (page - 1) * limit]);
      return { data: rows.map(serialize), pagination: { page, limit, total: Number(total), total_pages: Math.ceil(total / limit) } };
    },
    async create(data) {
      const hash = await bcrypt.hash(data.password, 12);
      const [result] = await pool.execute('INSERT INTO usuarios (nombre, correo, password, rol, activo) VALUES (?, ?, ?, ?, 1)',
        [data.nombre, data.correo, hash, data.rol]);
      return get(result.insertId);
    },
    update,
    async deactivate(id, actorId) { await update(id, { activo: false }, actorId); }
  };
}
module.exports = createUsuariosService;
