const { z } = require('zod');
const { id, idTexto, parametros, paginacion, busqueda, activo, fecha } = require('./comunes');

const stock = z.number().int().min(0).max(2147483647);
// Acepta 3.5 o "3.50" y siempre devuelve "3.50", igual que DECIMAL(10,2).
const precio = z.union([z.string(), z.number()]).transform(String)
  .pipe(z.string().regex(/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/, 'Usa un precio entre 0 y 99999999.99 con hasta dos decimales'))
  .transform(valor => {
    const [entero, decimal = ''] = valor.split('.');
    return `${entero}.${decimal.padEnd(2, '0')}`;
  });
const imagen = z.url().max(255).refine(valor => {
  try {
    const url = new URL(valor);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}, 'La imagen debe ser una URL HTTPS sin credenciales');

const consulta = z.object({
  ...paginacion,
  search: busqueda(150),
  activo: activo.default(true),
  id_categoria: idTexto.optional()
}).strict();

const consultaAlertas = z.object({ ...paginacion, search: busqueda(150) }).strict();

const campos = {
  id_categoria: id,
  codigo: z.string().trim().min(1).max(50),
  nombre: z.string().trim().min(1).max(150),
  descripcion: z.string().trim().max(10000).nullable().default(null),
  imagen: imagen.nullable().default(null),
  precio,
  fecha_vencimiento: fecha.nullable().default(null)
};

const crear = z.object({ ...campos, stock: stock.default(0), stock_minimo: stock.default(5) }).strict();
const actualizar = z.object({ ...campos, stock, stock_minimo: stock, activo: z.boolean().optional() }).strict();

module.exports = { parametros, consulta, consultaAlertas, crear, actualizar };
