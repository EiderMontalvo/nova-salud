const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const ErrorApi = require('../utils/error-api');
const paginacion = require('../utils/paginacion');
const enTransaccion = require('../utils/transaccion');

const columnas = 'id_usuario, nombre, correo, rol, activo, fecha_creacion';
const formatear = fila => ({ ...fila, activo: Boolean(fila.activo) });

async function obtener(id, conexion = pool) {
  const [filas] = await conexion.execute(`SELECT ${columnas} FROM usuarios WHERE id_usuario = ?`, [id]);
  if (!filas[0]) throw new ErrorApi(404, 'Usuario no encontrado');
  return formatear(filas[0]);
}

async function listar({ page, limit, search, activo }) {
  const where = '(nombre LIKE ? OR correo LIKE ?)' + (activo === undefined ? '' : ' AND activo = ?');
  const valores = [`%${search}%`, `%${search}%`, ...(activo === undefined ? [] : [Number(activo)])];
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM usuarios WHERE ${where}`, valores);
  const [filas] = await pool.execute(
    `SELECT ${columnas} FROM usuarios WHERE ${where} ORDER BY id_usuario DESC LIMIT ? OFFSET ?`,
    [...valores, limit, (page - 1) * limit]
  );
  return { data: filas.map(formatear), pagination: paginacion(page, limit, total) };
}

async function crear(datos) {
  const hash = await bcrypt.hash(datos.password, 12);
  const [resultado] = await pool.execute('INSERT INTO usuarios (nombre, correo, password, rol, activo) VALUES (?, ?, ?, ?, 1)',
    [datos.nombre, datos.correo, hash, datos.rol]);
  return obtener(resultado.insertId);
}

async function actualizar(id, datos, idActor) {
  const hash = datos.password ? await bcrypt.hash(datos.password, 12) : null;
  return enTransaccion(async conexion => {
    // Bloquear a los admins en el mismo orden evita que dos cambios simultáneos dejen el sistema sin ninguno.
    const [admins] = await conexion.execute("SELECT id_usuario FROM usuarios WHERE rol = 'ADMIN' AND activo = 1 ORDER BY id_usuario FOR UPDATE");
    const [filas] = await conexion.execute(`SELECT ${columnas} FROM usuarios WHERE id_usuario = ? FOR UPDATE`, [id]);
    if (!filas[0]) throw new ErrorApi(404, 'Usuario no encontrado');
    const actual = filas[0];
    const rol = datos.rol ?? actual.rol;
    const activo = datos.activo ?? Boolean(actual.activo);
    if (idActor === id && !activo) throw new ErrorApi(409, 'No puedes desactivar tu propia cuenta');
    if (actual.rol === 'ADMIN' && actual.activo && (rol !== 'ADMIN' || !activo) && admins.length <= 1) {
      throw new ErrorApi(409, 'Debe existir al menos un administrador activo');
    }
    await conexion.execute('UPDATE usuarios SET nombre = ?, correo = ?, rol = ?, activo = ?, password = COALESCE(?, password) WHERE id_usuario = ?',
      [datos.nombre ?? actual.nombre, datos.correo ?? actual.correo, rol, Number(activo), hash, id]);
    return obtener(id, conexion);
  });
}

async function desactivar(id, idActor) {
  await actualizar(id, { activo: false }, idActor);
}

module.exports = { obtener: id => obtener(id), listar, crear, actualizar, desactivar };
