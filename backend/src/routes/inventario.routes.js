const express = require('express');
const validate = require('../middlewares/validate');
const { list } = require('../validators/shared');
const { query } = require('../validators/productos.validators');
const createInventarioController = require('../controllers/inventario.controller');
function createInventarioRoutes(service, authenticate) {
  const router = express.Router();
  const controller = createInventarioController(service);
  router.use(authenticate);
  router.get('/', validate({ query }), controller.list);
  router.get('/stock-bajo', validate({ query: list }), controller.low);
  router.get('/por-vencer', validate({ query: list }), controller.expiring);
  return router;
}
module.exports = createInventarioRoutes;
