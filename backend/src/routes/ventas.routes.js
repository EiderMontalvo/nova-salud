const express = require('express');
const { z } = require('zod');
const validate = require('../middlewares/validate');
const { requireAdmin } = require('../middlewares/auth');
const schemas = require('../validators/ventas.validators');
const createVentasController = require('../controllers/ventas.controller');
function createVentasRoutes(service, authenticate) {
  const router = express.Router();
  const controller = createVentasController(service);
  router.use(authenticate);
  router.get('/', validate({ query: schemas.query }), controller.list);
  router.get('/:id', validate({ params: schemas.params }), controller.get);
  router.post('/', validate({ body: schemas.create }), controller.create);
  router.patch('/:id/anular', requireAdmin, validate({ params: schemas.params, body: z.object({}).strict().default({}) }), controller.cancel);
  return router;
}
module.exports = createVentasRoutes;
