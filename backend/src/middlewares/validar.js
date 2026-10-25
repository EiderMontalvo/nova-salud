const ErrorApi = require('../utils/error-api');

// Valida req.params, req.query o req.body con Zod y deja el resultado en req.validado.
function validar(esquemas) {
  return (req, res, next) => {
    req.validado = {};
    for (const [origen, esquema] of Object.entries(esquemas)) {
      const resultado = esquema.safeParse(req[origen]);
      if (!resultado.success) {
        return next(new ErrorApi(400, 'Datos de solicitud inválidos', resultado.error.issues.map(problema => ({
          field: [origen, ...problema.path].join('.'),
          message: problema.message
        }))));
      }
      req.validado[origen] = resultado.data;
    }
    next();
  };
}

module.exports = validar;
