const express = require('express');
const validate = require('../middlewares/validate');
const schemas = require('../validators/clientes.validators');
const resourceController = require('../controllers/resource.controller');

function createClientesRoutes(service, authenticate) {
  const router = express.Router();
  const controller = resourceController(service, { singular: 'Cliente', plural: 'Clientes', path: '/api/clientes' });
  router.use(authenticate);
  router.get('/', validate({ query: schemas.query }), controller.list);
  router.get('/:id', validate({ params: schemas.params }), controller.get);
  router.post('/', validate({ body: schemas.body }), controller.create);
  router.put('/:id', validate({ params: schemas.params, body: schemas.body }), controller.update);
  return router;
}
module.exports = createClientesRoutes;
