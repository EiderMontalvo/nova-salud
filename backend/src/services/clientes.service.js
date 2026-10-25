const { pool } = require('../config/database');
const ErrorApi = require('../utils/error-api');
const paginacion = require('../utils/paginacion');

const columnas = 'id_cliente, nombre, documento, telefono, correo, fecha_creacion';

async function obtener(id) {
  const [filas] = await pool.execute(`SELECT ${columnas} FROM clientes WHERE id_cliente = ?`, [id]);
  if (!filas[0]) throw new ErrorApi(404, 'Cliente no encontrado');
  return filas[0];
}

async function listar({ page, limit, search }) {
  const valores = [`%${search}%`, `%${search}%`];
  const where = '(nombre LIKE ? OR documento LIKE ?)';
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM clientes WHERE ${where}`, valores);
  const [filas] = await pool.execute(
    `SELECT ${columnas} FROM clientes WHERE ${where} ORDER BY id_cliente DESC LIMIT ? OFFSET ?`,
    [...valores, limit, (page - 1) * limit]
  );
  return { data: filas, pagination: paginacion(page, limit, total) };
}

async function guardar(sql, valores) {
  try {
    return (await pool.execute(sql, valores))[0];
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new ErrorApi(409, 'Ya existe un cliente con ese documento');
    throw error;
  }
}

async function crear(datos) {
  const resultado = await guardar('INSERT INTO clientes (nombre, documento, telefono, correo) VALUES (?, ?, ?, ?)',
    [datos.nombre, datos.documento, datos.telefono, datos.correo]);
  return obtener(resultado.insertId);
}

async function actualizar(id, datos) {
  await obtener(id);
  await guardar('UPDATE clientes SET nombre = ?, documento = ?, telefono = ?, correo = ? WHERE id_cliente = ?',
    [datos.nombre, datos.documento, datos.telefono, datos.correo, id]);
  return obtener(id);
}

module.exports = { obtener, listar, crear, actualizar };
