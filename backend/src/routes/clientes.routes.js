const express = require('express');
const validar = require('../middlewares/validar');
const { autenticar } = require('../middlewares/autenticacion');
const esquemas = require('../validators/clientes.validators');
const controlador = require('../controllers/clientes.controller');

const router = express.Router();
router.use(autenticar);

router.get('/', validar({ query: esquemas.consulta }), controlador.listar);
router.get('/:id', validar({ params: esquemas.parametros }), controlador.obtener);
router.post('/', validar({ body: esquemas.guardar }), controlador.crear);
router.put('/:id', validar({ params: esquemas.parametros, body: esquemas.guardar }), controlador.actualizar);

module.exports = router;
