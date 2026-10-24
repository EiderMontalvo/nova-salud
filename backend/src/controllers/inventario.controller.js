function createInventarioController(service) {
  async function list(method, req, res) {
    const result = await service[method](req.validated.query);
    res.json({ success: true, message: 'Inventario obtenido', ...result });
  }
  return {
    list: (req, res) => list('list', req, res),
    low: (req, res) => list('low', req, res),
    expiring: (req, res) => list('expiring', req, res),
    async summary(req, res) {
      const data = await service.summary();
      res.json({ success: true, message: 'Resumen obtenido', data });
    }
  };
}
module.exports = createInventarioController;
