const ref = name => ({ $ref: `#/components/schemas/${name}` });
const responseRef = name => ({ $ref: `#/components/responses/${name}` });
const integer = { type: 'integer', minimum: 1, maximum: 2147483647 };
const text = maxLength => ({ type: 'string', minLength: 1, maxLength });
const nullable = schema => ({ ...schema, nullable: true });
const money = { type: 'string', pattern: '^\\d+\\.\\d{2}$', example: '12.50' };
const date = { type: 'string', format: 'date', example: '2026-10-24' };
const timestamp = { type: 'string', format: 'date-time' };
const object = (properties, required = Object.keys(properties), extra = {}) => ({ type: 'object', required, properties, ...extra });
const strict = (properties, required = Object.keys(properties)) => object(properties, required, { additionalProperties: false });
const envelope = schema => object({ success: { type: 'boolean', enum: [true] }, message: { type: 'string' }, data: schema });
const page = schema => object({ success: { type: 'boolean', enum: [true] }, message: { type: 'string' }, data: { type: 'array', items: schema }, pagination: ref('Paginacion') });
const json = (description, schema) => ({ description, content: { 'application/json': { schema } } });
const parameter = (name, schema, description) => ({ name, in: 'query', schema, description });
const paging = [parameter('page', { type: 'integer', minimum: 1, maximum: 1000000, default: 1 }, 'Página'), parameter('limit', { type: 'integer', minimum: 1, maximum: 100, default: 20 }, 'Tamaño de página')];
const search = parameter('search', { type: 'string', maxLength: 100 }, 'Busca por nombre y correo, documento o código según el recurso. LIKE admite % y _ como comodines');
const idParameter = { name: 'id', in: 'path', required: true, schema: integer, example: 1 };
const password = { type: 'string', format: 'password', minLength: 12, description: 'Entre 12 caracteres y 72 bytes UTF-8. Se almacena con bcrypt; no se devuelve' };
const userFields = { nombre: text(100), correo: { type: 'string', format: 'email', maxLength: 100 }, rol: { type: 'string', enum: ['ADMIN', 'VENDEDOR'] } };
const clientFields = { nombre: text(100), documento: nullable(text(20)), telefono: nullable(text(20)), correo: nullable({ type: 'string', format: 'email', maxLength: 100 }) };
const saleFields = {
  id_venta: integer, id_usuario: integer, id_cliente: nullable(integer), fecha: { ...timestamp, description: 'Fecha de operación en America/Lima, incluye offset -05:00' },
  total: money, metodo_pago: { type: 'string', enum: ['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA'] }, estado: { type: 'string', enum: ['COMPLETADA', 'ANULADA'] }
};
const schemas = {
  UsuarioCrear: strict({ ...userFields, password }),
  UsuarioActualizar: strict({ ...userFields, password, activo: { type: 'boolean' } }, ['nombre', 'correo', 'rol']),
  Cliente: object({ id_cliente: integer, ...clientFields, fecha_creacion: nullable(timestamp) }),
  ClienteGuardar: strict(clientFields, ['nombre']),
  DetalleVenta: object({ id_detalle: integer, id_producto: integer, codigo: { type: 'string' }, nombre: { type: 'string' }, cantidad: integer, precio_unitario: money, subtotal: money }),
  VentaResumen: object(saleFields),
  Venta: object({ ...saleFields, detalles: { type: 'array', items: ref('DetalleVenta') } }),
  VentaCrear: strict({ id_cliente: nullable(integer), metodo_pago: saleFields.metodo_pago,
    detalles: { type: 'array', minItems: 1, maxItems: 100, description: 'Productos sin ids repetidos. El servidor obtiene precios y calcula importes', items: strict({ id_producto: integer, cantidad: integer }) }
  }, ['metodo_pago', 'detalles']),
  StockBajo: object({ id_producto: integer, codigo: { type: 'string' }, nombre: { type: 'string' }, imagen: nullable({ type: 'string' }), stock: { type: 'integer' }, stock_minimo: { type: 'integer' }, categoria: { type: 'string' } }),
  PorVencer: object({ id_producto: integer, codigo: { type: 'string' }, nombre: { type: 'string' }, imagen: nullable({ type: 'string' }), stock: { type: 'integer' }, fecha_vencimiento: nullable(date), dias_restantes: { type: 'integer' } }),
  Dashboard: object({ productos_activos: { type: 'integer' }, stock_bajo: { type: 'integer' }, por_vencer: { type: 'integer' }, ventas_del_dia: { type: 'integer' }, ingresos_del_dia: money, fecha: date, zona_horaria: { type: 'string', enum: ['America/Lima'] } }),
  ReporteVentas: {
    ...page(ref('VentaResumen')),
    required: ['success', 'message', 'data', 'pagination', 'resumen', 'periodo'],
    properties: {
      ...page(ref('VentaResumen')).properties,
      resumen: object({ cantidad_ventas: { type: 'integer' }, completadas: { type: 'integer' }, anuladas: { type: 'integer' }, ingresos: money }),
      periodo: object({ desde: date, hasta: date, zona_horaria: { type: 'string', enum: ['America/Lima'] } })
    }
  }
};
schemas.Cliente.example = { id_cliente: 1, nombre: 'Cliente de ejemplo', documento: 'DOC-EJEMPLO', telefono: null, correo: null, fecha_creacion: '2026-10-24T15:00:00Z' };
schemas.DetalleVenta.example = { id_detalle: 1, id_producto: 1, codigo: 'PROD-EJEMPLO', nombre: 'Producto de ejemplo', cantidad: 2, precio_unitario: '12.50', subtotal: '25.00' };
schemas.VentaResumen.example = { id_venta: 1, id_usuario: 1, id_cliente: null, fecha: '2026-10-24T10:00:00-05:00', total: '25.00', metodo_pago: 'EFECTIVO', estado: 'COMPLETADA' };
schemas.Venta.example = { ...schemas.VentaResumen.example, detalles: [schemas.DetalleVenta.example] };
const errors = {
  400: responseRef('BadRequest'), 401: responseRef('Unauthorized'), 403: responseRef('Forbidden'),
  404: json('Recurso inexistente', ref('RespuestaError')), 409: json('Registro duplicado, stock insuficiente, producto vencido o inactivo, anulación repetida, último administrador u operación simultánea en conflicto', ref('RespuestaError')),
  413: responseRef('TooLarge'), 500: responseRef('ServerError'),
  502: json('No se pudo acceder al almacenamiento SFTP', ref('RespuestaError')),
  503: json('Almacenamiento de imágenes no configurado o configuración inválida', ref('RespuestaError'))
};
function operation(tag, summary, schema, { status = 200, codes = [400, 401, 403, 404, 409, 500], body, example, parameters, description = '', createdPath } = {}) {
  const success = status === 204 ? { description: 'Operación completada, sin cuerpo' } : json(summary, schema);
  if (createdPath) success.headers = { Location: { description: 'URL del recurso creado', schema: { type: 'string', example: createdPath } } };
  const result = { tags: [tag], summary, description, security: [{ bearerAuth: [] }], responses: { [status]: success, ...Object.fromEntries(codes.map(code => [code, errors[code]])) } };
  if (body) result.requestBody = { required: true, content: { 'application/json': { schema: body, ...(example ? { example } : {}) } } };
  if (parameters) result.parameters = parameters;
  return result;
}

const usersQuery = [...paging, search, parameter('activo', { type: 'boolean' }, 'Si se omite incluye activos e inactivos')];
const clientQuery = [...paging, search];
const salesQuery = [...paging,
  parameter('desde', date, 'Fecha inicial inclusiva, America/Lima'), parameter('hasta', date, 'Fecha final inclusiva, America/Lima'),
  parameter('estado', saleFields.estado, 'Filtrar estado'), parameter('id_usuario', integer, 'ADMIN puede filtrar cualquier usuario. VENDEDOR solo sus ventas'), parameter('id_cliente', integer, 'Filtrar cliente')];
const writeCodes = [400, 401, 403, 404, 409, 413, 500];
const paths = {
  '/api/usuarios': {
    get: operation('Usuarios', 'Listar usuarios', page(ref('Usuario')), { parameters: usersQuery, codes: [400, 401, 403, 500], description: 'Solo ADMIN. Listado paginado sin hashes ni contraseñas' }),
    post: operation('Usuarios', 'Crear usuario', envelope(ref('Usuario')), { status: 201, createdPath: '/api/usuarios/1', codes: writeCodes, body: ref('UsuarioCrear'), example: { nombre: 'Vendedor de ejemplo', correo: 'vendedor@example.com', password: 'contraseña-de-ejemplo', rol: 'VENDEDOR' }, description: 'Solo ADMIN. No existe registro público. Se crea activo' })
  },
  '/api/usuarios/{id}': {
    parameters: [idParameter],
    get: operation('Usuarios', 'Consultar usuario', envelope(ref('Usuario')), { codes: [400, 401, 403, 404, 500], description: 'Solo ADMIN. No devuelve password ni hash' }),
    put: operation('Usuarios', 'Actualizar usuario', envelope(ref('Usuario')), { body: ref('UsuarioActualizar'), codes: writeCodes, description: 'Solo ADMIN. Requiere nombre, correo y rol. Omite password para conservar el hash y activo para conservar el estado. No permite desactivar la propia cuenta ni eliminar el último ADMIN activo. Cambiar la contraseña no revoca tokens previos, que vencen en una hora' }),
    delete: operation('Usuarios', 'Desactivar usuario', null, { status: 204, description: 'Solo ADMIN. Eliminación lógica. No permite desactivar la propia cuenta ni al último ADMIN activo. Las solicitudes siguientes del usuario desactivado devuelven 401' })
  },
  '/api/clientes': {
    get: operation('Clientes', 'Listar clientes', page(ref('Cliente')), { parameters: clientQuery, codes: [400, 401, 500], description: 'ADMIN y VENDEDOR. Búsqueda por nombre o documento' }),
    post: operation('Clientes', 'Registrar cliente', envelope(ref('Cliente')), { status: 201, createdPath: '/api/clientes/1', body: ref('ClienteGuardar'), codes: [400, 401, 409, 413, 500], example: { nombre: 'Cliente de ejemplo', documento: 'DOC-EJEMPLO', telefono: null, correo: null }, description: 'ADMIN y VENDEDOR. Nombre obligatorio. Campos omitidos quedan en null. Documento único cuando se proporciona' })
  },
  '/api/clientes/{id}': {
    parameters: [idParameter],
    get: operation('Clientes', 'Consultar cliente', envelope(ref('Cliente')), { codes: [400, 401, 404, 500] }),
    put: operation('Clientes', 'Actualizar cliente', envelope(ref('Cliente')), { body: ref('ClienteGuardar'), codes: [400, 401, 404, 409, 413, 500], description: 'ADMIN y VENDEDOR. Reemplaza los campos; los opcionales omitidos quedan en null. No existe eliminación de clientes' })
  },
  '/api/ventas': {
    get: operation('Ventas', 'Consultar historial de ventas', page(ref('VentaResumen')), { parameters: salesQuery, codes: [400, 401, 403, 500], description: 'ADMIN consulta todas las ventas; VENDEDOR solo las propias. Sin fechas devuelve todo el historial paginado. desde no puede superar hasta' }),
    post: operation('Ventas', 'Registrar venta y descontar stock', envelope(ref('Venta')), { status: 201, createdPath: '/api/ventas/1', body: ref('VentaCrear'), codes: writeCodes,
      example: { id_cliente: null, metodo_pago: 'EFECTIVO', detalles: [{ id_producto: 1, cantidad: 2 }] },
      description: 'ADMIN o VENDEDOR. Cliente opcional. Entre 1 y 100 productos sin repetir. Rechaza campos desconocidos, precios enviados por el cliente, productos inexistentes, inactivos, vencidos o stock insuficiente. Precios de MariaDB y cálculos exactos en centavos; máximo total 99999999.99. Usuario del token. Venta, detalles y stock se confirman juntos o se revierten por completo. Vencido significa fecha anterior al día actual de Lima. No implementa clave de idempotencia: no reenvíes automáticamente un POST tras una respuesta de red incierta; comprueba primero el historial.' })
  },
  '/api/ventas/{id}': {
    parameters: [idParameter],
    get: operation('Ventas', 'Consultar venta con sus detalles', envelope(ref('Venta')), { codes: [400, 401, 403, 404, 500], description: 'ADMIN consulta cualquier venta. VENDEDOR solo las propias. Los importes se conservan aunque cambie el precio del producto' })
  },
  '/api/ventas/{id}/anular': {
    parameters: [idParameter],
    patch: operation('Ventas', 'Anular venta y restaurar stock', envelope(ref('Venta')), { description: 'Solo ADMIN. Sin cuerpo o JSON vacío. Una venta completada se anula en una transacción y restaura cantidades aun si el producto está inactivo o vencido. No borra ventas ni detalles. Repetir la anulación devuelve 409 sin volver a incrementar stock' })
  },
  '/api/inventario': {
    get: operation('Inventario', 'Consultar inventario', page(ref('Producto')), { parameters: [...paging, parameter('search', { type: 'string', maxLength: 150 }, 'Nombre o código, búsqueda LIKE'), parameter('activo', { type: 'boolean', default: true }, 'Estado del producto'), parameter('id_categoria', integer, 'Categoría')], codes: [400, 401, 500], description: 'ADMIN y VENDEDOR. Misma respuesta y filtros que GET /api/productos. Refleja las ventas confirmadas en la siguiente consulta' })
  },
  '/api/inventario/stock-bajo': {
    get: operation('Inventario', 'Consultar alertas de stock bajo', page(ref('StockBajo')), { parameters: clientQuery, codes: [400, 401, 500], description: 'ADMIN y VENDEDOR. Usa vista_stock_bajo: productos activos con stock menor o igual a stock_minimo. Incluye sin existencias' })
  },
  '/api/inventario/por-vencer': {
    get: operation('Inventario', 'Consultar productos próximos a vencer', page(ref('PorVencer')), { parameters: clientQuery, codes: [400, 401, 500], description: 'ADMIN y VENDEDOR. Usa la vista existente: activos, con stock mayor a cero y vencimiento entre hoy y los próximos 30 días inclusive. Sesión MariaDB en UTC-05:00' })
  },
  '/api/dashboard/resumen': {
    get: operation('Dashboard', 'Obtener resumen del día', envelope(ref('Dashboard')), { codes: [401, 403, 500], description: 'Solo ADMIN. Productos activos, alertas y ventas COMPLETADAS del día de Lima. Excluye anuladas de ventas_del_dia e ingresos_del_dia' })
  },
  '/api/reportes/ventas': {
    get: operation('Reportes', 'Obtener reporte de ventas', ref('ReporteVentas'), { parameters: [...paging, parameter('desde', date, 'Inclusiva; por defecto hoy en Lima'), parameter('hasta', date, 'Inclusiva; por defecto hoy en Lima')], codes: [400, 401, 403, 500], description: 'Solo ADMIN. Historial paginado con resumen de todo el período. Incluye anuladas en el historial y su conteo; las excluye de ingresos. desde no puede superar hasta. Fechas en America/Lima' })
  },
  '/api/productos/{id}/imagen': {
    parameters: [idParameter],
    post: {
      ...operation('Productos', 'Subir imagen de un producto a BanaHosting', envelope(ref('Producto')), { codes: [400, 401, 403, 404, 413, 500, 502, 503], description: 'Solo ADMIN. Un archivo JPEG, PNG o WebP real, sin animación, hasta 5 MB y 25 megapíxeles. Se inspecciona el contenido, se recodifica a WebP de hasta 1600x1600 y se asigna un UUID. SFTP con huella de servidor verificada. MariaDB guarda solo la URL HTTPS. Requiere configuración SFTP. No elimina imágenes anteriores para evitar borrar referencias compartidas' }),
      requestBody: { required: true, content: { 'multipart/form-data': { schema: strict({ imagen: { type: 'string', format: 'binary' } }) } } }
    }
  }
};
paths['/api/productos/{id}/imagen'].post.responses[413] = json('El archivo excede el límite de 5 MB', ref('RespuestaError'));
module.exports = { paths, components: { schemas } };
