const express = require('express');
const validar = require('../middlewares/validar');
const { autenticar, soloAdmin } = require('../middlewares/autenticacion');
const { reporte } = require('../validators/ventas.validators');
const controlador = require('../controllers/ventas.controller');

const router = express.Router();
router.get('/ventas', autenticar, soloAdmin, validar({ query: reporte }), controlador.reporte);

module.exports = router;
