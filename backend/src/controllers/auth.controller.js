const authService = require('../services/auth.service');

async function iniciarSesion(req, res) {
  const data = await authService.iniciarSesion(req.validado.body);
  res.set('Cache-Control', 'no-store').json({ success: true, message: 'Inicio de sesión correcto', data });
}

function perfil(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, message: 'Usuario autenticado', data: req.usuario });
}

module.exports = { iniciarSesion, perfil };
