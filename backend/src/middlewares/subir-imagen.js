const multer = require('multer');
const ErrorApi = require('../utils/error-api');

const leerArchivo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 }
}).single('imagen');

function subirImagen(req, res, next) {
  leerArchivo(req, res, error => {
    if (error && !(error instanceof multer.MulterError)) return next(new ErrorApi(400, 'Formulario multipart inválido'));
    next(error);
  });
}

module.exports = subirImagen;
