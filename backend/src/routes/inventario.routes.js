const express = require('express');
const validar = require('../middlewares/validar');
const { autenticar } = require('../middlewares/autenticacion');
const esquemas = require('../validators/productos.validators');
const controlador = require('../controllers/inventario.controller');

const router = express.Router();
router.use(autenticar);

router.get('/', validar({ query: esquemas.consulta }), controlador.listar);
router.get('/stock-bajo', validar({ query: esquemas.consultaAlertas }), controlador.stockBajo);
router.get('/por-vencer', validar({ query: esquemas.consultaAlertas }), controlador.porVencer);

module.exports = router;
