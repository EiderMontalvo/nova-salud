const express = require('express');
const validate = require('../middlewares/validate');
const { requireAdmin } = require('../middlewares/auth');
const schemas = require('../validators/productos.validators');
const createProductosController = require('../controllers/productos.controller');
const imageUpload = require('../middlewares/image-upload');

function createProductosRoutes(service, authenticate, images) {
  const router = express.Router();
  const controller = createProductosController(service);
  router.use(authenticate);
  router.get('/', validate({ query: schemas.query }), controller.list);
  router.get('/:id', validate({ params: schemas.params }), controller.get);
  router.post('/:id/imagen', requireAdmin, validate({ params: schemas.params }), imageUpload, async (req, res) => {
    const data = await images.upload(req.validated.params.id, req.file);
    res.json({ success: true, message: 'Imagen actualizada', data });
  });
  router.post('/', requireAdmin, validate({ body: schemas.create }), controller.create);
  router.put('/:id', requireAdmin, validate({ params: schemas.params, body: schemas.update }), controller.update);
  router.delete('/:id', requireAdmin, validate({ params: schemas.params }), controller.deactivate);
  return router;
}

module.exports = createProductosRoutes;
