const multer = require('multer');
const ApiError = require('../utils/api-error');
const parse = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 }
}).single('imagen');

module.exports = (req, res, next) => parse(req, res, error => {
  if (error && !(error instanceof multer.MulterError)) return next(new ApiError(400, 'Formulario multipart inválido'));
  next(error);
});
