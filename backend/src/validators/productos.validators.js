const { z } = require('zod');

const id = z.number().int().min(1).max(2147483647);
const queryInteger = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(id);
const stock = z.number().int().min(0).max(2147483647);
const price = z.union([z.string(), z.number()]).transform(String)
  .pipe(z.string().regex(/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/, 'Usa un precio entre 0 y 99999999.99 con hasta dos decimales'))
  .transform(value => {
    const [whole, decimal = ''] = value.split('.');
    return `${whole}.${decimal.padEnd(2, '0')}`;
  });
const image = z.url().max(255).refine(value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}, 'La imagen debe ser una URL HTTPS sin credenciales');

const params = z.object({ id: queryInteger });
const query = z.object({
  page: queryInteger.refine(value => value <= 1000000, 'La página máxima es 1000000').default(1),
  limit: queryInteger.refine(value => value <= 100, 'El límite máximo es 100').default(20),
  search: z.string().trim().max(150).default(''),
  activo: z.enum(['true', 'false']).transform(value => value === 'true').default(true),
  id_categoria: queryInteger.optional()
}).strict();

const fields = {
  id_categoria: id,
  codigo: z.string().trim().min(1).max(50),
  nombre: z.string().trim().min(1).max(150),
  descripcion: z.string().trim().max(10000).nullable().default(null),
  imagen: image.nullable().default(null),
  precio: price,
  fecha_vencimiento: z.iso.date().refine(value => value >= '1000-01-01', 'La fecha mínima es 1000-01-01').nullable().default(null)
};

const create = z.object({ ...fields, stock: stock.default(0), stock_minimo: stock.default(5) }).strict();
const update = z.object({ ...fields, stock, stock_minimo: stock, activo: z.boolean().optional() }).strict();

module.exports = { params, query, create, update };
