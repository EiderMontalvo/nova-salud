const inventarioService = require('../services/inventario.service');
const productosService = require('../services/productos.service');

async function listar(req, res) {
  const resultado = await productosService.listar(req.validado.query);
  res.json({ success: true, message: 'Inventario obtenido', ...resultado });
}

async function stockBajo(req, res) {
  const resultado = await inventarioService.listarStockBajo(req.validado.query);
  res.json({ success: true, message: 'Productos con stock bajo', ...resultado });
}

async function porVencer(req, res) {
  const resultado = await inventarioService.listarPorVencer(req.validado.query);
  res.json({ success: true, message: 'Productos por vencer', ...resultado });
}

async function resumen(req, res) {
  const data = await inventarioService.obtenerResumen();
  res.json({ success: true, message: 'Resumen obtenido', data });
}

module.exports = { listar, stockBajo, porVencer, resumen };
