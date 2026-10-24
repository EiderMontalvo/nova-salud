const express = require('express');
const ApiError = require('../utils/api-error');

function createProductosRoutes(pool) {
  const router = express.Router();
  router.get('/', async (req, res) => {
    try {
      const [productos] = await pool.query(`
        SELECT
          id_producto,
          codigo,
          nombre,
          descripcion,
          imagen,
          precio,
          stock,
          stock_minimo,
          fecha_vencimiento,
          id_categoria
        FROM productos
        WHERE activo = 1
        ORDER BY id_producto DESC
      `);
      res.json(productos);
    } catch {
      throw new ApiError(500, 'Error al obtener productos');
    }
  });
  return router;
}

module.exports = createProductosRoutes;
