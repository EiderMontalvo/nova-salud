const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const Parser = require('@apidevtools/swagger-parser');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const createApp = require('../src/app');
const swagger = require('../src/config/swagger');
const { pool } = require('../src/config/database');

const secret = 'products-test-only-secret-with-more-than-32-characters';
const input = { id_categoria: 1, codigo: 'NUEVO', nombre: 'Producto de prueba', precio: '3.50', stock: 20, stock_minimo: 5 };
let products;
let calls;
let failWriteCode;
let failProductRead;
let app;
let spec;
const ajv = addFormats(new Ajv({ strict: false }));

function token(id = 1) {
  return jwt.sign({}, secret, { algorithm: 'HS256', issuer: 'nova-salud', audience: 'nova-salud-web', subject: String(id), expiresIn: '1h' });
}

function checkContract(method, path, status, body) {
  const schema = spec.paths[path][method].responses[status].content['application/json'].schema;
  const validate = ajv.compile(schema);
  assert.equal(validate(body), true, JSON.stringify(validate.errors));
}

function matching(sql, values) {
  const [active, search] = values;
  const term = search.slice(1, -1).toLowerCase();
  return products.filter(row => row.activo === active
    && (row.nombre.toLowerCase().includes(term) || row.codigo.toLowerCase().includes(term))
    && (!sql.includes('AND id_categoria = ?') || row.id_categoria === values[3]));
}

const database = {
  async execute(sql, values) {
    calls.push({ sql, values });
    if (sql.includes('FROM usuarios')) {
      return [[{ id_usuario: values[0], nombre: 'Usuario de prueba', correo: 'test@example.com', rol: values[0] === 1 ? 'ADMIN' : 'VENDEDOR', activo: 1, fecha_creacion: null }]];
    }
    if (sql.startsWith('SELECT id_categoria FROM categorias')) {
      return [values[0] === 1 || values[0] === 2 ? [{ id_categoria: values[0] }] : []];
    }
    if (sql.includes('FROM productos')) {
      if (failProductRead) throw Object.assign(new Error('private-sql-data'), { code: 'ECONNREFUSED' });
      if (sql.includes('WHERE id_producto = ?')) return [products.filter(row => row.id_producto === values[0])];
      if (sql.includes('COUNT(*)')) return [[{ total: matching(sql, values).length }]];
      const limit = values.at(-2);
      const offset = values.at(-1);
      assert.equal(typeof limit, 'number');
      assert.equal(typeof offset, 'number');
      return [matching(sql, values).sort((a, b) => b.id_producto - a.id_producto).slice(offset, offset + limit)];
    }
    if (failWriteCode) throw Object.assign(new Error('private-write-data'), { code: failWriteCode });
    if (sql.startsWith('INSERT INTO productos') || sql.startsWith('UPDATE productos SET id_categoria')) {
      const [id_categoria, codigo, nombre, descripcion, imagen, precio, stock, stock_minimo, fecha_vencimiento] = values;
      const updating = sql.startsWith('UPDATE');
      const id = updating ? values[10] : Math.max(...products.map(row => row.id_producto)) + 1;
      if (products.some(row => row.id_producto !== id && row.codigo.toLowerCase() === codigo.toLowerCase())) {
        throw Object.assign(new Error('private-duplicate-key'), { code: 'ER_DUP_ENTRY' });
      }
      const fields = { id_categoria, codigo, nombre, descripcion, imagen, precio, stock, stock_minimo, fecha_vencimiento };
      if (updating) {
        const row = products.find(product => product.id_producto === id);
        Object.assign(row, fields, { activo: values[9] ?? row.activo });
      } else {
        products.push({ id_producto: id, ...fields, activo: 1, fecha_creacion: null });
      }
      return [{ insertId: id, affectedRows: 1 }];
    }
    if (sql.startsWith('UPDATE productos SET activo = 0')) {
      products.find(row => row.id_producto === values[0]).activo = 0;
      return [{ affectedRows: 1 }];
    }
    throw new Error('SQL inesperado');
  }
};

before(async () => {
  app = createApp({ pool: database, jwtSecret: secret });
  spec = await Parser.validate(structuredClone(swagger));
});

after(() => pool.end());

beforeEach(() => {
  products = [
    { id_producto: 1, id_categoria: 1, codigo: 'PARA-500', nombre: 'Paracetamol', descripcion: null, imagen: null, precio: '3.50', stock: 20, stock_minimo: 5, fecha_vencimiento: '2027-12-31', activo: 1, fecha_creacion: new Date('2026-10-24T15:00:00Z') },
    { id_producto: 2, id_categoria: 2, codigo: 'VIT-C', nombre: 'Vitamina C', descripcion: null, imagen: null, precio: '10.00', stock: 0, stock_minimo: 5, fecha_vencimiento: null, activo: 1, fecha_creacion: null },
    { id_producto: 3, id_categoria: 1, codigo: 'ARCHIVADO', nombre: 'Producto desactivado', descripcion: null, imagen: null, precio: '2.00', stock: 5, stock_minimo: 3, fecha_vencimiento: '2020-01-01', activo: 0, fecha_creacion: null }
  ];
  calls = [];
  failWriteCode = undefined;
  failProductRead = false;
});

test('los cinco endpoints de productos requieren JWT', async () => {
  for (const [method, path] of [['get', '/api/productos'], ['get', '/api/productos/1'], ['post', '/api/productos'], ['put', '/api/productos/1'], ['delete', '/api/productos/1']]) {
    const response = await request(app)[method](path).send(input).expect(401);
    checkContract(method, path.endsWith('/1') ? '/api/productos/{id}' : path, 401, response.body);
  }
  assert.equal(calls.length, 0);
});

test('vendedor puede listar y consultar, pero no escribir', async () => {
  const list = await request(app).get('/api/productos').auth(token(2), { type: 'bearer' }).expect(200);
  checkContract('get', '/api/productos', 200, list.body);
  const detail = await request(app).get('/api/productos/1').auth(token(2), { type: 'bearer' }).expect(200);
  checkContract('get', '/api/productos/{id}', 200, detail.body);
  for (const [method, path] of [['post', '/api/productos'], ['put', '/api/productos/1'], ['delete', '/api/productos/1']]) {
    await request(app)[method](path).auth(token(2), { type: 'bearer' }).send(input).expect(403);
  }
  assert.equal(calls.some(call => /^(INSERT|UPDATE|DELETE)/.test(call.sql)), false);
});

test('listado ordenado, paginado y con filtros combinados por categoría, nombre o código', async () => {
  const list = await request(app).get('/api/productos?limit=1').auth(token(), { type: 'bearer' }).expect(200);
  assert.deepEqual(list.body.pagination, { page: 1, limit: 1, total: 2, total_pages: 2 });
  assert.equal(list.body.data[0].id_producto, 2);
  assert.equal(Array.isArray(list.body), false);
  const second = await request(app).get('/api/productos?limit=1&page=2').auth(token(), { type: 'bearer' }).expect(200);
  assert.equal(second.body.data[0].id_producto, 1);
  for (const search of ['paracetamol', 'PARA-500']) {
    const filtered = await request(app).get('/api/productos').query({ id_categoria: 1, search }).auth(token(), { type: 'bearer' }).expect(200);
    assert.equal(filtered.body.data.length, 1);
    assert.equal(filtered.body.data[0].id_producto, 1);
    assert.equal(filtered.body.data[0].precio, '3.50');
    assert.equal(filtered.body.data[0].fecha_vencimiento, '2027-12-31');
    assert.equal(filtered.body.data[0].fecha_creacion, '2026-10-24T15:00:00.000Z');
    assert.equal(filtered.body.data[0].activo, true);
    checkContract('get', '/api/productos', 200, filtered.body);
  }
});

test('permite consultar inactivos y devuelve lista vacía cuando no hay coincidencias', async () => {
  const inactive = await request(app).get('/api/productos?activo=false').auth(token(), { type: 'bearer' }).expect(200);
  assert.equal(inactive.body.data[0].id_producto, 3);
  for (const query of ['id_categoria=999', 'search=ninguno']) {
    const empty = await request(app).get(`/api/productos?${query}`).auth(token(), { type: 'bearer' }).expect(200);
    assert.deepEqual(empty.body.data, []);
    assert.equal(empty.body.pagination.total_pages, 0);
  }
});

test('rechaza query desconocida, repetida, malformada o fuera de límites antes de consultar productos', async () => {
  for (const query of ['page=0', 'page=1000001', 'limit=101', 'limit=1.5', 'activo=1', 'extra=true', 'id_categoria=0', 'id_categoria=2147483648', 'id_categoria=1&id_categoria=2', `search=${'x'.repeat(151)}`]) {
    await request(app).get(`/api/productos?${query}`).auth(token(), { type: 'bearer' }).expect(400);
  }
  assert.equal(calls.some(call => call.sql.includes('FROM productos')), false);
});

test('buscar texto SQL lo envía únicamente como parámetro', async () => {
  const search = "' OR 1=1 --";
  await request(app).get('/api/productos').query({ search }).auth(token(), { type: 'bearer' }).expect(200);
  const productQueries = calls.filter(call => call.sql.includes('FROM productos'));
  assert.equal(productQueries.length, 2);
  for (const call of productQueries) {
    assert.equal(call.sql.includes(search), false);
    assert.equal(call.values[1], `%${search}%`);
  }
});

test('crear recorta textos y aplica defaults sin perder precisión decimal', async () => {
  const body = { id_categoria: 1, codigo: ' NUEVO ', nombre: ' Producto nuevo ', precio: 0.1 };
  const response = await request(app).post('/api/productos').auth(token(), { type: 'bearer' }).send(body).expect(201);
  assert.equal(response.headers.location, '/api/productos/4');
  assert.equal(response.body.data.codigo, 'NUEVO');
  assert.equal(response.body.data.nombre, 'Producto nuevo');
  assert.equal(response.body.data.precio, '0.10');
  assert.equal(response.body.data.stock, 0);
  assert.equal(response.body.data.stock_minimo, 5);
  assert.equal(response.body.data.fecha_vencimiento, null);
  assert.equal(response.body.data.imagen, null);
  assert.equal(response.body.data.activo, true);
  checkContract('post', '/api/productos', 201, response.body);
});

test('acepta cero, precio máximo y cadenas con uno o dos decimales', async () => {
  for (const [index, precio] of [0, '0', '99999999.99', '12.5', 3.5].entries()) {
    const response = await request(app).post('/api/productos').auth(token(), { type: 'bearer' })
      .send({ ...input, codigo: `VALIDO-${index}`, precio }).expect(201);
    checkContract('post', '/api/productos', 201, response.body);
    assert.match(response.body.data.precio, /^\d+\.\d{2}$/);
  }
});

test('rechaza precios negativos, fuera de DECIMAL(10,2), ambiguos o con más de dos decimales', async () => {
  for (const precio of [-1, '100000000.00', 100000000, '1.001', 0.1 + 0.2, '', '01.20', '1e2', '1,20', ' 1.20 ', null, true]) {
    const response = await request(app).post('/api/productos').auth(token(), { type: 'bearer' }).send({ ...input, precio }).expect(400);
    assert.ok(response.body.errors.some(error => error.field === 'body.precio'));
  }
  assert.equal(calls.some(call => call.sql.startsWith('INSERT')), false);
});

test('valida existencias y límites de enteros', async () => {
  for (const [field, value] of [['stock', -1], ['stock_minimo', -1], ['stock', 1.5], ['stock_minimo', '5'], ['stock', 2147483648], ['stock', null]]) {
    await request(app).post('/api/productos').auth(token(), { type: 'bearer' }).send({ ...input, [field]: value }).expect(400);
  }
  const maximum = await request(app).post('/api/productos').auth(token(), { type: 'bearer' })
    .send({ ...input, stock: 2147483647, stock_minimo: 0 }).expect(201);
  assert.equal(maximum.body.data.stock, 2147483647);
});

test('rechaza textos vacíos, excesivos, categorías inválidas y campos desconocidos', async () => {
  for (const body of [
    {}, { ...input, codigo: ' ' }, { ...input, nombre: '' }, { ...input, codigo: 'x'.repeat(51) },
    { ...input, nombre: 'x'.repeat(151) }, { ...input, descripcion: 'x'.repeat(10001) },
    { ...input, id_categoria: '1' }, { ...input, id_categoria: 0 }, { ...input, activo: false }, { ...input, id_producto: 8 }
  ]) await request(app).post('/api/productos').auth(token(), { type: 'bearer' }).send(body).expect(400);
  assert.equal(calls.some(call => call.sql.startsWith('INSERT')), false);
});

test('rechaza categoría inexistente en creación y actualización sin escribir', async () => {
  for (const [method, path] of [['post', '/api/productos'], ['put', '/api/productos/1']]) {
    const response = await request(app)[method](path).auth(token(), { type: 'bearer' }).send({ ...input, id_categoria: 999 }).expect(400);
    assert.equal(response.body.message, 'La categoría indicada no existe');
    checkContract(method, method === 'post' ? path : '/api/productos/{id}', 400, response.body);
  }
  assert.equal(calls.some(call => /^(INSERT|UPDATE)/.test(call.sql)), false);
});

test('código duplicado incluso de un inactivo devuelve 409 al crear o actualizar', async () => {
  for (const [method, path, codigo] of [['post', '/api/productos', 'archivado'], ['put', '/api/productos/1', 'VIT-C']]) {
    const response = await request(app)[method](path).auth(token(), { type: 'bearer' }).send({ ...input, codigo }).expect(409);
    assert.equal(response.body.message, 'Ya existe un producto con ese código');
    checkContract(method, method === 'post' ? path : '/api/productos/{id}', 409, response.body);
    assert.equal(JSON.stringify(response.body).includes('private'), false);
  }
});

test('valida fechas reales, límites SQL y bisiestos; admite fechas vencidas y null', async () => {
  for (const fecha_vencimiento of ['2025-02-29', '2026-02-30', '2026-13-01', '2026-01-01T00:00:00Z', '0999-12-31', '1900-02-29', '']) {
    await request(app).post('/api/productos').auth(token(), { type: 'bearer' }).send({ ...input, fecha_vencimiento }).expect(400);
  }
  for (const [index, fecha_vencimiento] of ['2024-02-29', '1000-01-01', '9999-12-31', null].entries()) {
    const response = await request(app).post('/api/productos').auth(token(), { type: 'bearer' })
      .send({ ...input, codigo: `FECHA-${index}`, fecha_vencimiento }).expect(201);
    assert.equal(response.body.data.fecha_vencimiento, fecha_vencimiento);
    checkContract('post', '/api/productos', 201, response.body);
  }
});

test('imagen acepta referencia HTTPS o null y rechaza URLs inseguras, inválidas y largas', async () => {
  for (const imagen of ['https://example.com/producto.jpg', null]) {
    const response = await request(app).put('/api/productos/1').auth(token(), { type: 'bearer' })
      .send({ ...input, codigo: 'PARA-500', imagen }).expect(200);
    assert.equal(response.body.data.imagen, imagen);
    checkContract('put', '/api/productos/{id}', 200, response.body);
  }
  for (const imagen of ['incorrecto', 'http://example.com/x.jpg', 'javascript:alert(1)', 'data:image/png;base64,x', 'https://user:password@example.com/x.jpg', `https://example.com/${'x'.repeat(255)}`, '/uploads/image.jpg']) {
    await request(app).post('/api/productos').auth(token(), { type: 'bearer' }).send({ ...input, imagen }).expect(400);
  }
});

test('PUT exige stock y stock_minimo; permite modificar y reactivar sin duplicar ni borrar filas', async () => {
  const { stock, stock_minimo, ...withoutStock } = input;
  await request(app).put('/api/productos/1').auth(token(), { type: 'bearer' }).send(withoutStock).expect(400);
  await request(app).put('/api/productos/1').auth(token(), { type: 'bearer' }).send({ ...withoutStock, stock }).expect(400);
  const updated = await request(app).put('/api/productos/1').auth(token(), { type: 'bearer' })
    .send({ ...input, codigo: 'PARA-500', stock: 50, precio: '4.99', activo: false }).expect(200);
  assert.equal(updated.body.data.stock, 50);
  assert.equal(updated.body.data.precio, '4.99');
  assert.equal(updated.body.data.activo, false);
  const preserved = await request(app).put('/api/productos/1').auth(token(), { type: 'bearer' })
    .send({ ...input, codigo: 'PARA-500' }).expect(200);
  assert.equal(preserved.body.data.activo, false);
  const restored = await request(app).put('/api/productos/1').auth(token(), { type: 'bearer' })
    .send({ ...input, codigo: 'PARA-500', activo: true }).expect(200);
  assert.equal(restored.body.data.activo, true);
  assert.equal(products.length, 3);
});

test('DELETE es lógico e idempotente, conserva stock y permite consulta histórica', async () => {
  for (let i = 0; i < 2; i++) {
    const response = await request(app).delete('/api/productos/1').auth(token(), { type: 'bearer' }).expect(204);
    assert.equal(response.text, '');
  }
  assert.equal(products.length, 3);
  assert.equal(products[0].stock, 20);
  const detail = await request(app).get('/api/productos/1').auth(token(), { type: 'bearer' }).expect(200);
  assert.equal(detail.body.data.activo, false);
  const list = await request(app).get('/api/productos').auth(token(), { type: 'bearer' }).expect(200);
  assert.equal(list.body.data.some(row => row.id_producto === 1), false);
  assert.equal(calls.some(call => call.sql.startsWith('DELETE')), false);
});

test('id inválido devuelve 400 e inexistente devuelve 404 sin escrituras', async () => {
  for (const id of ['0', '-1', 'abc', '1.5', '2147483648']) {
    await request(app).get(`/api/productos/${id}`).auth(token(), { type: 'bearer' }).expect(400);
  }
  for (const method of ['get', 'put', 'delete']) {
    const req = request(app)[method]('/api/productos/999').auth(token(), { type: 'bearer' });
    if (method === 'put') req.send(input);
    const response = await req.expect(404);
    checkContract(method, '/api/productos/{id}', 404, response.body);
  }
  assert.equal(calls.some(call => /^(INSERT|UPDATE|DELETE)/.test(call.sql)), false);
});

test('error de clave foránea concurrente es 400; otros fallos SQL no exponen detalles', async () => {
  failWriteCode = 'ER_NO_REFERENCED_ROW_2';
  await request(app).post('/api/productos').auth(token(), { type: 'bearer' }).send(input).expect(400);
  failWriteCode = 'ECONNREFUSED';
  const write = await request(app).post('/api/productos').auth(token(), { type: 'bearer' }).send(input).expect(500);
  checkContract('post', '/api/productos', 500, write.body);
  assert.equal(JSON.stringify(write.body).includes('private'), false);
  failProductRead = true;
  const read = await request(app).get('/api/productos').auth(token(), { type: 'bearer' }).expect(500);
  checkContract('get', '/api/productos', 500, read.body);
});
