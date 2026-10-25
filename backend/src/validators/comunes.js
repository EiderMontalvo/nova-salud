const { z } = require('zod');

const id = z.number().int().min(1).max(2147483647);
const idTexto = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(id);
const parametros = z.object({ id: idTexto });
const paginacion = {
  page: idTexto.refine(valor => valor <= 1000000, 'La página máxima es 1000000').default(1),
  limit: idTexto.refine(valor => valor <= 100, 'El límite máximo es 100').default(20)
};
const busqueda = (maximo = 100) => z.string().trim().max(maximo).default('');
const activo = z.enum(['true', 'false']).transform(valor => valor === 'true');
const listado = z.object({ ...paginacion, search: busqueda() }).strict();
const fecha = z.iso.date().refine(valor => valor >= '1000-01-01', 'La fecha mínima es 1000-01-01');
const correo = z.email().max(100).transform(valor => valor.toLowerCase());
const imagen = z.url().max(255).refine(valor => {
  try {
    const url = new URL(valor);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}, 'La imagen debe ser una URL HTTPS sin credenciales');

module.exports = { id, idTexto, parametros, paginacion, busqueda, activo, listado, fecha, correo, imagen };
