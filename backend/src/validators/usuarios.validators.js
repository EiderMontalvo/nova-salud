const { z } = require('zod');
const { params, pagination } = require('./shared');
const { admin } = require('./auth.validators');
const password = admin.shape.password;
const fields = {
  nombre: z.string().trim().min(1).max(100),
  correo: z.email().max(100).transform(value => value.toLowerCase()),
  rol: z.enum(['ADMIN', 'VENDEDOR'])
};
const create = z.object({ ...fields, password }).strict();
const update = z.object({ ...fields, password: password.optional(), activo: z.boolean().optional() }).strict();
const query = z.object({ ...pagination, search: z.string().trim().max(100).default(''),
  activo: z.enum(['true', 'false']).transform(value => value === 'true').optional() }).strict();
module.exports = { params, create, update, query };
