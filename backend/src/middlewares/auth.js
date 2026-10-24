const ApiError = require('../utils/api-error');

function authenticate(authService) {
  return async (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') || '');
    if (!match) throw new ApiError(401, 'Se requiere un token Bearer');
    req.user = await authService.authenticate(match[1]);
    next();
  };
}

function requireAdmin(req, res, next) {
  if (req.user.rol !== 'ADMIN') throw new ApiError(403, 'Se requiere el rol ADMIN');
  next();
}

module.exports = { authenticate, requireAdmin };
