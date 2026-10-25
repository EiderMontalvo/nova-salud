const express = require('express');
const { pool } = require('../config/database');
const ErrorApi = require('../utils/error-api');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API en funcionamiento', timestamp: new Date().toISOString() });
});

router.get('/health/db', async (req, res) => {
  try {
    await pool.query('SELECT 1');
  } catch {
    throw new ErrorApi(503, 'No se pudo conectar a la base de datos');
  }
  res.json({ success: true, message: 'Conexión a la base de datos exitosa' });
});

module.exports = router;
