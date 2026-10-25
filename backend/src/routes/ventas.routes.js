const express = require('express');
const validar = require('../middlewares/validar');
const { autenticar, soloAdmin } = require('../middlewares/autenticacion');
const esquemas = require('../validators/ventas.validators');
const controlador = require('../controllers/ventas.controller');

const router = express.Router();
router.use(autenticar);

router.get('/', validar({ query: esquemas.consulta }), controlador.listar);
router.get('/:id', validar({ params: esquemas.parametros }), controlador.obtener);
router.post('/', validar({ body: esquemas.crear }), controlador.registrar);
router.patch('/:id/anular', soloAdmin, validar({ params: esquemas.parametros, body: esquemas.anular }), controlador.anular);

module.exports = router;
