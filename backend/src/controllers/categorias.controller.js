const categoriasService = require('../services/categorias.service');

async function listar(req, res) {
  const resultado = await categoriasService.listar(req.validado.query);
  res.json({ success: true, message: 'Categorías obtenidas', ...resultado });
}

async function obtener(req, res) {
  const data = await categoriasService.obtener(req.validado.params.id);
  res.json({ success: true, message: 'Categoría obtenida', data });
}

async function crear(req, res) {
  const data = await categoriasService.crear(req.validado.body);
  res.status(201).json({ success: true, message: 'Categoría registrada', data });
}

async function actualizar(req, res) {
  const data = await categoriasService.actualizar(req.validado.params.id, req.validado.body);
  res.json({ success: true, message: 'Categoría actualizada', data });
}

async function desactivar(req, res) {
  await categoriasService.desactivar(req.validado.params.id);
  res.status(204).end();
}

module.exports = { listar, obtener, crear, actualizar, desactivar };
