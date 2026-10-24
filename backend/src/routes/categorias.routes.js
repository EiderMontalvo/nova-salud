const express = require('express');
const validate = require('../middlewares/validate');
const { requireAdmin } = require('../middlewares/auth');
const schemas = require('../validators/categorias.validators');
const createCategoriasController = require('../controllers/categorias.controller');

function createCategoriasRoutes(service, authenticate) {
  const router = express.Router();
  const controller = createCategoriasController(service);
  router.use(authenticate);
  router.get('/', validate({ query: schemas.query }), controller.list);
  router.get('/:id', validate({ params: schemas.params }), controller.get);
  router.post('/', requireAdmin, validate({ body: schemas.create }), controller.create);
  router.put('/:id', requireAdmin, validate({ params: schemas.params, body: schemas.update }), controller.update);
  router.delete('/:id', requireAdmin, validate({ params: schemas.params }), controller.deactivate);
  return router;
}

module.exports = createCategoriasRoutes;
