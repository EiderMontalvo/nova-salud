
const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

/**
 * @openapi
 * /api/productos:
 *   get:
 *     tags:
 *       - Productos
 *     summary: Listar productos activos
 *     description: Obtiene los productos registrados en Nova Salud
 *     responses:
 *       200:
 *         description: Lista de productos obtenida
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_producto:
 *                     type: integer
 *                   codigo:
 *                     type: string
 *                   nombre:
 *                     type: string
 *                   precio:
 *                     type: number
 *                   stock:
 *                     type: integer
 *       500:
 *         description: Error del servidor
 */
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
  } catch (error) {
    console.error('Error al listar productos:', error.code);

    res.status(500).json({
      success: false,
      message: 'Error al obtener productos'
    });
  }
});

module.exports = router;
