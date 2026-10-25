const { z } = require('zod');
const { id, idTexto, parametros, paginacion, fecha } = require('./comunes');
const { hoy } = require('../utils/hora-lima');

const crear = z.object({
  id_cliente: id.nullable().default(null),
  metodo_pago: z.enum(['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA']),
  detalles: z.array(z.object({ id_producto: id, cantidad: id }).strict()).min(1).max(100)
}).strict().refine(valor => new Set(valor.detalles.map(item => item.id_producto)).size === valor.detalles.length,
  'No repitas productos en los detalles');

const rangoValido = valor => !valor.desde || !valor.hasta || valor.desde <= valor.hasta;

const consulta = z.object({
  ...paginacion,
  desde: fecha.optional(),
  hasta: fecha.optional(),
  estado: z.enum(['COMPLETADA', 'ANULADA']).optional(),
  id_usuario: idTexto.optional(),
  id_cliente: idTexto.optional()
}).strict().refine(rangoValido, 'desde no puede superar hasta');

const reporte = z.object({ ...paginacion, desde: fecha.default(hoy), hasta: fecha.default(hoy) })
  .strict().refine(rangoValido, 'desde no puede superar hasta');

const anular = z.object({}).strict().default({});

module.exports = { parametros, crear, consulta, reporte, anular };
