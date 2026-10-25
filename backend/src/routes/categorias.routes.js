const express = require('express');
const validar = require('../middlewares/validar');
const { autenticar, soloAdmin } = require('../middlewares/autenticacion');
const esquemas = require('../validators/categorias.validators');
const controlador = require('../controllers/categorias.controller');

const router = express.Router();
router.use(autenticar);

router.get('/', validar({ query: esquemas.consulta }), controlador.listar);
router.get('/:id', validar({ params: esquemas.parametros }), controlador.obtener);
router.post('/', soloAdmin, validar({ body: esquemas.crear }), controlador.crear);
router.put('/:id', soloAdmin, validar({ params: esquemas.parametros, body: esquemas.actualizar }), controlador.actualizar);
router.delete('/:id', soloAdmin, validar({ params: esquemas.parametros }), controlador.desactivar);

module.exports = router;
