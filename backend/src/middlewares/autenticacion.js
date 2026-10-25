const ErrorApi = require('../utils/error-api');
const authService = require('../services/auth.service');

async function autenticar(req, res, next) {
  const coincidencia = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') || '');
  if (!coincidencia) throw new ErrorApi(401, 'Se requiere un token Bearer');
  req.usuario = await authService.verificarToken(coincidencia[1]);
  next();
}

function soloAdmin(req, res, next) {
  if (req.usuario.rol !== 'ADMIN') throw new ErrorApi(403, 'Se requiere el rol ADMIN');
  next();
}

module.exports = { autenticar, soloAdmin };
