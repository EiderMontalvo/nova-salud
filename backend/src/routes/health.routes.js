const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verificar el estado de la API
 *     description: Endpoint para verificar si la API está funcionando correctamente
 *     responses:
 *       200:
 *         description: API en funcionamiento
 */

router.get('/health', async(req, res)=> {
    res.status(200).json({
        success: true, 
        message: 'API en funcionamiento',
        timestamp: new Date().toISOString()
    });
});

/**
 * @swagger
 *  /api/health/db:
 *    get:
 *      tags:
 *      - Sistema
 *      summary: Verificar la conexión a la base de datos
 *      responses:
 *        200:
 *          description: Conexión a la base de datos exitosa
 *        500:
 *          description: Error al conectar a la base de datos
 */

router.get('/health/db', async(req, res) =>{
    if(process.env.NODE_ENV === 'development') {
        return res.status(400).json({
            message: 'Ruta no encontrada'
        });
    }

    try {
        await pool.query('SELECT 1');
        res.json({
            success: true,
            message: 'Conexión a la base de datos exitosa'
        });
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error);
        res.status(503).json({
            success: false,
            message: 'No se pudo conectar a la base de datos',
        });
    }
});

module.exports = router;