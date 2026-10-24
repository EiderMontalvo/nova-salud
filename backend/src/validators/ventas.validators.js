const { z } = require('zod');
const { id, queryId, params, pagination, date } = require('./shared');
const { today } = require('../utils/business-time');
const create = z.object({
  id_cliente: id.nullable().default(null),
  metodo_pago: z.enum(['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA']),
  detalles: z.array(z.object({ id_producto: id, cantidad: id }).strict()).min(1).max(100)
}).strict().refine(value => new Set(value.detalles.map(item => item.id_producto)).size === value.detalles.length,
  'No repitas productos en los detalles');
const range = {
  desde: date.optional(), hasta: date.optional(), estado: z.enum(['COMPLETADA', 'ANULADA']).optional(),
  id_usuario: queryId.optional(), id_cliente: queryId.optional()
};
const validRange = value => !value.desde || !value.hasta || value.desde <= value.hasta;
const query = z.object({ ...pagination, ...range }).strict().refine(validRange, 'desde no puede superar hasta');
const report = z.object({ ...pagination, desde: date.default(today), hasta: date.default(today) })
  .strict().refine(validRange, 'desde no puede superar hasta');
module.exports = { params, create, query, report };
