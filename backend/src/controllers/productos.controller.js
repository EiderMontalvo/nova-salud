function createProductosController(service) {
  return {
    async list(req, res) {
      const result = await service.list(req.validated.query);
      res.json({ success: true, message: 'Productos obtenidos', ...result });
    },
    async get(req, res) {
      const data = await service.getById(req.validated.params.id);
      res.json({ success: true, message: 'Producto obtenido', data });
    },
    async create(req, res) {
      const data = await service.create(req.validated.body);
      res.status(201).location(`/api/productos/${data.id_producto}`)
        .json({ success: true, message: 'Producto registrado', data });
    },
    async update(req, res) {
      const data = await service.update(req.validated.params.id, req.validated.body);
      res.json({ success: true, message: 'Producto actualizado', data });
    },
    async deactivate(req, res) {
      await service.deactivate(req.validated.params.id);
      res.status(204).end();
    }
  };
}

module.exports = createProductosController;
