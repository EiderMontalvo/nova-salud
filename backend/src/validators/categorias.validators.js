const { z } = require('zod');
const { parametros, paginacion, busqueda, activo, imagen } = require('./comunes');

const consulta = z.object({ ...paginacion, search: busqueda(), activo: activo.default(true) }).strict();

const campos = {
  nombre: z.string().trim().min(1).max(100),
  descripcion: z.string().trim().max(255).nullable().default(null),
  imagen: imagen.nullable().default(null)
};

const crear = z.object(campos).strict();
const actualizar = z.object({ ...campos, activo: z.boolean().optional() }).strict();

module.exports = { parametros, consulta, crear, actualizar };
