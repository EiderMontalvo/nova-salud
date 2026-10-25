const sharp = require('sharp');
const { pool } = require('../config/database');
const ErrorApi = require('../utils/error-api');
const almacenamiento = require('../config/almacenamiento-imagenes');
const productosService = require('./productos.service');

async function subirImagenProducto(id, archivo) {
  if (!archivo) throw new ErrorApi(400, 'Envía un archivo en el campo imagen');
  await productosService.obtener(id);

  let buffer;
  try {
    const imagen = sharp(archivo.buffer, { limitInputPixels: 25000000, failOn: 'warning' });
    const metadatos = await imagen.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadatos.format) || (metadatos.pages || 1) !== 1) {
      throw new Error('Formato no permitido');
    }
    // Recodificar elimina metadatos y evita publicar el archivo original sin inspección.
    buffer = await imagen.rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch {
    throw new ErrorApi(400, 'La imagen debe ser JPEG, PNG o WebP válida, sin animación y hasta 25 megapíxeles');
  }

  const subida = await almacenamiento.subirArchivo(buffer);
  try {
    const [resultado] = await pool.execute('UPDATE productos SET imagen = ? WHERE id_producto = ?', [subida.url, id]);
    if (resultado.affectedRows !== 1) throw new ErrorApi(404, 'Producto no encontrado');
  } catch (error) {
    try { await almacenamiento.eliminarArchivo(subida.clave); } catch { console.error('No se pudo limpiar la imagen recién subida'); }
    throw error;
  }
  return productosService.obtener(id);
}

module.exports = { subirImagenProducto };
