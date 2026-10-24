const ApiError = require('../utils/api-error');

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  let status = 500;
  let message = 'Error interno del servidor';
  let errors = [];

  if (error instanceof ApiError) {
    ({ status, message, errors } = error);
  } else if (error.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'Ya existe un registro con ese nombre o correo';
  } else if (error.type === 'entity.parse.failed') {
    status = 400;
    message = 'El cuerpo debe contener JSON válido';
  } else if (error.type === 'entity.too.large') {
    status = 413;
    message = 'El cuerpo excede el límite de 1 MB';
  } else {
    console.error('Error de solicitud:', error.code || error.name);
  }

  res.status(status).json({ success: false, message, errors });
}

module.exports = errorHandler;
