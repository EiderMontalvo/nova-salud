const { z } = require('zod');
const { parametros, listado: consulta, correo } = require('./comunes');

const guardar = z.object({
  nombre: z.string().trim().min(1).max(100),
  documento: z.string().trim().min(1).max(20).nullable().default(null),
  telefono: z.string().trim().min(1).max(20).nullable().default(null),
  correo: correo.nullable().default(null)
}).strict();

module.exports = { parametros, consulta, guardar };
