const { z } = require('zod');
const { parametros, paginacion, busqueda, activo, correo } = require('./comunes');
const { passwordNueva } = require('./auth.validators');

const campos = {
  nombre: z.string().trim().min(1).max(100),
  correo,
  rol: z.enum(['ADMIN', 'VENDEDOR'])
};

const crear = z.object({ ...campos, password: passwordNueva }).strict();
const actualizar = z.object({ ...campos, password: passwordNueva.optional(), activo: z.boolean().optional() }).strict();
const consulta = z.object({ ...paginacion, search: busqueda(), activo: activo.optional() }).strict();

module.exports = { parametros, crear, actualizar, consulta };
