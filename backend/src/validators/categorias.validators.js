const { z } = require('zod');

const positiveInteger = z.string().regex(/^[1-9]\d*$/).transform(Number)
  .refine(Number.isSafeInteger, 'Debe ser un entero positivo seguro');

const params = z.object({ id: positiveInteger });
const query = z.object({
  page: positiveInteger.refine(value => value <= 1000000, 'La página máxima es 1000000').default(1),
  limit: positiveInteger.refine(value => value <= 100, 'El límite máximo es 100').default(20),
  search: z.string().trim().max(100).default(''),
  activo: z.enum(['true', 'false']).transform(value => value === 'true').default(true)
}).strict();

const fields = {
  nombre: z.string().trim().min(1).max(100),
  descripcion: z.string().trim().max(255).nullable().default(null)
};

const create = z.object(fields).strict();
const update = z.object({ ...fields, activo: z.boolean().optional() }).strict();

module.exports = { params, query, create, update };
