const sharp = require('sharp');
const ApiError = require('../utils/api-error');

function createImagenesService(pool, products, storage) {
  return {
    async upload(id, file) {
      if (!file) throw new ApiError(400, 'Envía un archivo en el campo imagen');
      await products.getById(id);
      let buffer;
      try {
        const image = sharp(file.buffer, { limitInputPixels: 25000000, failOn: 'warning' });
        const metadata = await image.metadata();
        if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) !== 1) {
          throw new Error('Formato no permitido');
        }
        // Recodificar elimina metadatos y evita publicar el archivo original sin inspección.
        buffer = await image.rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
      } catch {
        throw new ApiError(400, 'La imagen debe ser JPEG, PNG o WebP válida, sin animación y hasta 25 megapíxeles');
      }
      const uploaded = await storage.upload(buffer);
      try {
        const url = new URL(uploaded.url);
        if (url.protocol !== 'https:' || url.username || url.password || uploaded.url.length > 255) throw new ApiError(502, 'El almacenamiento devolvió una URL inválida');
        const [result] = await pool.execute('UPDATE productos SET imagen = ? WHERE id_producto = ?', [uploaded.url, id]);
        if (result.affectedRows !== 1) throw new ApiError(404, 'Producto no encontrado');
      } catch (error) {
        try { await storage.remove(uploaded.key); } catch { console.error('No se pudo limpiar la imagen recién subida'); }
        throw error;
      }
      return products.getById(id);
    }
  };
}
module.exports = createImagenesService;
