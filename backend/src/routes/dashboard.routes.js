const express = require('express');
const { autenticar, soloAdmin } = require('../middlewares/autenticacion');
const controlador = require('../controllers/inventario.controller');

const router = express.Router();
router.get('/resumen', autenticar, soloAdmin, controlador.resumen);

module.exports = router;
