const express = require('express');
const validar = require('../middlewares/validar');
const { autenticar, soloAdmin } = require('../middlewares/autenticacion');
const esquemas = require('../validators/usuarios.validators');
const controlador = require('../controllers/usuarios.controller');

const router = express.Router();
router.use(autenticar, soloAdmin);

router.get('/', validar({ query: esquemas.consulta }), controlador.listar);
router.get('/:id', validar({ params: esquemas.parametros }), controlador.obtener);
router.post('/', validar({ body: esquemas.crear }), controlador.crear);
router.put('/:id', validar({ params: esquemas.parametros, body: esquemas.actualizar }), controlador.actualizar);
router.delete('/:id', validar({ params: esquemas.parametros }), controlador.desactivar);

module.exports = router;
