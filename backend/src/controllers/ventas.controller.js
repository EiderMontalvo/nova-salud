const ventasService = require('../services/ventas.service');

async function listar(req, res) {
  const resultado = await ventasService.listar(req.validado.query, req.usuario);
  res.json({ success: true, message: 'Ventas obtenidas', ...resultado });
}

async function obtener(req, res) {
  const data = await ventasService.obtener(req.validado.params.id, req.usuario);
  res.json({ success: true, message: 'Venta obtenida', data });
}

async function registrar(req, res) {
  const data = await ventasService.registrar(req.validado.body, req.usuario);
  res.status(201).json({ success: true, message: 'Venta registrada', data });
}

async function anular(req, res) {
  const data = await ventasService.anular(req.validado.params.id, req.usuario);
  res.json({ success: true, message: 'Venta anulada', data });
}

async function reporte(req, res) {
  const resultado = await ventasService.generarReporte(req.validado.query);
  res.json({ success: true, message: 'Reporte de ventas obtenido', ...resultado });
}

module.exports = { listar, obtener, registrar, anular, reporte };
