const { z } = require('zod');
const { params, list: query } = require('./shared');
const body = z.object({
  nombre: z.string().trim().min(1).max(100),
  documento: z.string().trim().min(1).max(20).nullable().default(null),
  telefono: z.string().trim().min(1).max(20).nullable().default(null),
  correo: z.email().max(100).transform(value => value.toLowerCase()).nullable().default(null)
}).strict();
module.exports = { params, query, body };
