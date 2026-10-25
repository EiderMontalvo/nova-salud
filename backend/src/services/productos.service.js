const { pool } = require('../config/database');
const ErrorApi = require('../utils/error-api');
const paginacion = require('../utils/paginacion');

// DATE_FORMAT evita que el vencimiento cambie de día al serializar zonas horarias.
const columnas = `id_producto, id_categoria, codigo, nombre, descripcion, imagen,
  precio, stock, stock_minimo, DATE_FORMAT(fecha_vencimiento, '%Y-%m-%d') AS fecha_vencimiento,
  activo, fecha_creacion`;

const formatear = fila => ({ ...fila, activo: Boolean(fila.activo) });

async function obtener(id) {
  const [filas] = await pool.execute(`SELECT ${columnas} FROM productos WHERE id_producto = ?`, [id]);
  if (!filas[0]) throw new ErrorApi(404, 'Producto no encontrado');
  return formatear(filas[0]);
}

async function verificarCategoria(id) {
  const [filas] = await pool.execute('SELECT id_categoria FROM categorias WHERE id_categoria = ?', [id]);
  if (!filas.length) throw new ErrorApi(400, 'La categoría indicada no existe');
}

async function guardar(sql, valores) {
  try {
    return (await pool.execute(sql, valores))[0];
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new ErrorApi(409, 'Ya existe un producto con ese código');
    if (error.code === 'ER_NO_REFERENCED_ROW_2') throw new ErrorApi(400, 'La categoría indicada no existe');
    throw error;
  }
}

function valoresDe(datos) {
  return [datos.id_categoria, datos.codigo, datos.nombre, datos.descripcion, datos.imagen,
    datos.precio, datos.stock, datos.stock_minimo, datos.fecha_vencimiento];
}

async function listar({ page, limit, search, activo, id_categoria }) {
  const condiciones = ['activo = ?', '(nombre LIKE ? OR codigo LIKE ?)'];
  const filtro = [Number(activo), `%${search}%`, `%${search}%`];
  if (id_categoria !== undefined) {
    condiciones.push('id_categoria = ?');
    filtro.push(id_categoria);
  }
  const where = condiciones.join(' AND ');
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM productos WHERE ${where}`, filtro);
  const [filas] = await pool.execute(
    `SELECT ${columnas} FROM productos WHERE ${where} ORDER BY id_producto DESC LIMIT ? OFFSET ?`,
    [...filtro, limit, (page - 1) * limit]
  );
  return { data: filas.map(formatear), pagination: paginacion(page, limit, total) };
}

async function crear(datos) {
  await verificarCategoria(datos.id_categoria);
  const resultado = await guardar(
    'INSERT INTO productos (id_categoria, codigo, nombre, descripcion, imagen, precio, stock, stock_minimo, fecha_vencimiento, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
    valoresDe(datos)
  );
  return obtener(resultado.insertId);
}

async function actualizar(id, datos) {
  await obtener(id);
  await verificarCategoria(datos.id_categoria);
  await guardar(
    'UPDATE productos SET id_categoria = ?, codigo = ?, nombre = ?, descripcion = ?, imagen = ?, precio = ?, stock = ?, stock_minimo = ?, fecha_vencimiento = ?, activo = COALESCE(?, activo) WHERE id_producto = ?',
    [...valoresDe(datos), datos.activo === undefined ? null : Number(datos.activo), id]
  );
  return obtener(id);
}

async function desactivar(id) {
  await obtener(id);
  await pool.execute('UPDATE productos SET activo = 0 WHERE id_producto = ?', [id]);
}

module.exports = { obtener, listar, crear, actualizar, desactivar };
