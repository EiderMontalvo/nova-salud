const ApiError = require('../utils/api-error');

function validate(schemas) {
  return (req, res, next) => {
    req.validated = {};
    for (const [source, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        return next(new ApiError(400, 'Datos de solicitud inválidos', result.error.issues.map(issue => ({
          field: [source, ...issue.path].join('.'),
          message: issue.message
        }))));
      }
      req.validated[source] = result.data;
    }
    next();
  };
}

module.exports = validate;
