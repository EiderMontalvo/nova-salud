const { pool } = require('../config/database');
const ErrorApi = require('../utils/error-api');
const paginacion = require('../utils/paginacion');

const formatear = fila => ({ ...fila, activo: Boolean(fila.activo) });

async function obtener(id) {
  const [filas] = await pool.execute('SELECT id_categoria, nombre, descripcion, imagen, activo FROM categorias WHERE id_categoria = ?', [id]);
  if (!filas[0]) throw new ErrorApi(404, 'Categoría no encontrada');
  return formatear(filas[0]);
}

async function listar({ page, limit, search, activo }) {
  const filtro = [Number(activo), `%${search}%`];
  const [[{ total }]] = await pool.execute('SELECT COUNT(*) AS total FROM categorias WHERE activo = ? AND nombre LIKE ?', filtro);
  const [filas] = await pool.execute(
    'SELECT id_categoria, nombre, descripcion, imagen, activo FROM categorias WHERE activo = ? AND nombre LIKE ? ORDER BY id_categoria DESC LIMIT ? OFFSET ?',
    [...filtro, limit, (page - 1) * limit]
  );
  return { data: filas.map(formatear), pagination: paginacion(page, limit, total) };
}

async function crear({ nombre, descripcion, imagen }) {
  const [resultado] = await pool.execute('INSERT INTO categorias (nombre, descripcion, imagen, activo) VALUES (?, ?, ?, 1)', [nombre, descripcion, imagen]);
  return obtener(resultado.insertId);
}

async function actualizar(id, { nombre, descripcion, imagen, activo }) {
  await obtener(id);
  await pool.execute(
    'UPDATE categorias SET nombre = ?, descripcion = ?, imagen = ?, activo = COALESCE(?, activo) WHERE id_categoria = ?',
    [nombre, descripcion, imagen, activo === undefined ? null : Number(activo), id]
  );
  return obtener(id);
}

async function desactivar(id) {
  await obtener(id);
  await pool.execute('UPDATE categorias SET activo = 0 WHERE id_categoria = ?', [id]);
}

module.exports = { obtener, listar, crear, actualizar, desactivar };
