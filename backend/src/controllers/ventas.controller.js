const resourceController = require('./resource.controller');
function createVentasController(service) {
  return {
    ...resourceController(service, { singular: 'Venta', plural: 'Ventas', path: '/api/ventas', feminine: true }),
    async cancel(req, res) {
      const data = await service.cancel(req.validated.params.id, req.user);
      res.json({ success: true, message: 'Venta anulada', data });
    },
    async report(req, res) {
      const result = await service.report(req.validated.query);
      res.json({ success: true, message: 'Reporte de ventas obtenido', ...result });
    }
  };
}
module.exports = createVentasController;
