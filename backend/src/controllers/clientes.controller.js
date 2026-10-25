const clientesService = require('../services/clientes.service');

async function listar(req, res) {
  const resultado = await clientesService.listar(req.validado.query);
  res.json({ success: true, message: 'Clientes obtenidos', ...resultado });
}

async function obtener(req, res) {
  const data = await clientesService.obtener(req.validado.params.id);
  res.json({ success: true, message: 'Cliente obtenido', data });
}

async function crear(req, res) {
  const data = await clientesService.crear(req.validado.body);
  res.status(201).json({ success: true, message: 'Cliente registrado', data });
}

async function actualizar(req, res) {
  const data = await clientesService.actualizar(req.validado.params.id, req.validado.body);
  res.json({ success: true, message: 'Cliente actualizado', data });
}

module.exports = { listar, obtener, crear, actualizar };
