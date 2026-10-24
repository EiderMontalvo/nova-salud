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
  } else if (error.code === 'ER_LOCK_DEADLOCK' || error.code === 'ER_LOCK_WAIT_TIMEOUT') {
    status = 409;
    message = 'Conflicto entre operaciones simultáneas. Vuelve a intentar';
  } else if (error.name === 'MulterError') {
    status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = error.code === 'LIMIT_FILE_SIZE' ? 'La imagen excede el límite de 5 MB' : 'Envía un único archivo en el campo imagen, sin campos adicionales';
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
