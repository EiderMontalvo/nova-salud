const ErrorApi = require('../utils/error-api');

function manejarErrores(error, req, res, next) {
  if (res.headersSent) return next(error);

  let estado = 500;
  let mensaje = 'Error interno del servidor';
  let errores = [];

  if (error instanceof ErrorApi) {
    ({ estado, errores } = error);
    mensaje = error.message;
  } else if (error.code === 'ER_DUP_ENTRY') {
    estado = 409;
    mensaje = 'Ya existe un registro con ese nombre o correo';
  } else if (error.code === 'ER_LOCK_DEADLOCK' || error.code === 'ER_LOCK_WAIT_TIMEOUT') {
    estado = 409;
    mensaje = 'Conflicto entre operaciones simultáneas. Vuelve a intentar';
  } else if (error.name === 'MulterError') {
    estado = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    mensaje = error.code === 'LIMIT_FILE_SIZE' ? 'La imagen excede el límite de 5 MB' : 'Envía un único archivo en el campo imagen, sin campos adicionales';
  } else if (error.type === 'entity.parse.failed') {
    estado = 400;
    mensaje = 'El cuerpo debe contener JSON válido';
  } else if (error.type === 'entity.too.large') {
    estado = 413;
    mensaje = 'El cuerpo excede el límite de 1 MB';
  } else {
    console.error('Error de solicitud:', error.code || error.name);
  }

  res.status(estado).json({ success: false, message: mensaje, errors: errores });
}

module.exports = manejarErrores;
