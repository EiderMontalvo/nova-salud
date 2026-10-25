const sharp = require('sharp');
const { pool } = require('../config/database');
const ErrorApi = require('../utils/error-api');
const almacenamiento = require('../config/almacenamiento-imagenes');
const productosService = require('./productos.service');
const categoriasService = require('./categorias.service');

async function convertirAWebp(archivo) {
  if (!archivo) throw new ErrorApi(400, 'Envía un archivo en el campo imagen');
  try {
    const imagen = sharp(archivo.buffer, { limitInputPixels: 25000000, failOn: 'warning' });
    const metadatos = await imagen.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadatos.format) || (metadatos.pages || 1) !== 1) {
      throw new Error('Formato no permitido');
    }
    // Recodificar elimina metadatos y evita publicar el archivo original sin inspección.
    return await imagen.rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch {
    throw new ErrorApi(400, 'La imagen debe ser JPEG, PNG o WebP válida, sin animación y hasta 25 megapíxeles');
  }
}

// La tabla y la columna vienen de este archivo, nunca del cliente.
async function guardarImagen(sql, id, archivo, mensajeNoEncontrado) {
  const buffer = await convertirAWebp(archivo);
  const subida = await almacenamiento.subirArchivo(buffer);
  try {
    const [resultado] = await pool.execute(sql, [subida.url, id]);
    if (resultado.affectedRows !== 1) throw new ErrorApi(404, mensajeNoEncontrado);
  } catch (error) {
    try { await almacenamiento.eliminarArchivo(subida.clave); } catch { console.error('No se pudo limpiar la imagen recién subida'); }
    throw error;
  }
}

async function subirImagenProducto(id, archivo) {
  await productosService.obtener(id);
  await guardarImagen('UPDATE productos SET imagen = ? WHERE id_producto = ?', id, archivo, 'Producto no encontrado');
  return productosService.obtener(id);
}

async function subirImagenCategoria(id, archivo) {
  await categoriasService.obtener(id);
  await guardarImagen('UPDATE categorias SET imagen = ? WHERE id_categoria = ?', id, archivo, 'Categoría no encontrada');
  return categoriasService.obtener(id);
}

module.exports = { subirImagenProducto, subirImagenCategoria };
