const productosService = require('../services/productos.service');
const imagenesService = require('../services/imagenes.service');

async function listar(req, res) {
  const resultado = await productosService.listar(req.validado.query);
  res.json({ success: true, message: 'Productos obtenidos', ...resultado });
}

async function obtener(req, res) {
  const data = await productosService.obtener(req.validado.params.id);
  res.json({ success: true, message: 'Producto obtenido', data });
}

async function crear(req, res) {
  const data = await productosService.crear(req.validado.body);
  res.status(201).json({ success: true, message: 'Producto registrado', data });
}

async function actualizar(req, res) {
  const data = await productosService.actualizar(req.validado.params.id, req.validado.body);
  res.json({ success: true, message: 'Producto actualizado', data });
}

async function desactivar(req, res) {
  await productosService.desactivar(req.validado.params.id);
  res.status(204).end();
}

async function subirImagen(req, res) {
  const data = await imagenesService.subirImagenProducto(req.validado.params.id, req.file);
  res.json({ success: true, message: 'Imagen actualizada', data });
}

module.exports = { listar, obtener, crear, actualizar, desactivar, subirImagen };
