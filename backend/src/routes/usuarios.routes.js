const express = require('express');
const validate = require('../middlewares/validate');
const { requireAdmin } = require('../middlewares/auth');
const schemas = require('../validators/usuarios.validators');
const resourceController = require('../controllers/resource.controller');

function createUsuariosRoutes(service, authenticate) {
  const router = express.Router();
  const controller = resourceController(service, { singular: 'Usuario', plural: 'Usuarios', path: '/api/usuarios' });
  router.use(authenticate, requireAdmin);
  router.get('/', validate({ query: schemas.query }), controller.list);
  router.get('/:id', validate({ params: schemas.params }), controller.get);
  router.post('/', validate({ body: schemas.create }), controller.create);
  router.put('/:id', validate({ params: schemas.params, body: schemas.update }), controller.update);
  router.delete('/:id', validate({ params: schemas.params }), controller.deactivate);
  return router;
}
module.exports = createUsuariosRoutes;
