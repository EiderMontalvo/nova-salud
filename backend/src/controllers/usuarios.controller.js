const usuariosService = require('../services/usuarios.service');

async function listar(req, res) {
  const resultado = await usuariosService.listar(req.validado.query);
  res.json({ success: true, message: 'Usuarios obtenidos', ...resultado });
}

async function obtener(req, res) {
  const data = await usuariosService.obtener(req.validado.params.id);
  res.json({ success: true, message: 'Usuario obtenido', data });
}

async function crear(req, res) {
  const data = await usuariosService.crear(req.validado.body);
  res.status(201).json({ success: true, message: 'Usuario registrado', data });
}

async function actualizar(req, res) {
  const data = await usuariosService.actualizar(req.validado.params.id, req.validado.body, req.usuario.id_usuario);
  res.json({ success: true, message: 'Usuario actualizado', data });
}

async function desactivar(req, res) {
  await usuariosService.desactivar(req.validado.params.id, req.usuario.id_usuario);
  res.status(204).end();
}

module.exports = { listar, obtener, crear, actualizar, desactivar };
