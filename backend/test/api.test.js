const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SwaggerParser = require('@apidevtools/swagger-parser');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const createApp = require('../src/app');
const swagger = require('../src/config/swagger');
const { pool: defaultPool } = require('../src/config/database');

const secret = 'test-only-secret-for-nova-salud-at-least-32';
const credentials = { correo: 'admin@example.com', password: 'clave-de-prueba' };
let users;
let categories;
let app;
let hash;
let failDatabase;
let writes;
let document;
const ajv = addFormats(new Ajv({ strict: false }));

function token(id = 1, options = {}) {
  return jwt.sign({}, secret, {
    algorithm: 'HS256', issuer: 'nova-salud', audience: 'nova-salud-web',
    subject: String(id), expiresIn: '1h', ...options
  });
}

function checkContract(path, method, status, body) {
  const schema = document.paths[path][method].responses[status].content['application/json'].schema;
  const validate = ajv.compile(schema);
  assert.equal(validate(body), true, JSON.stringify(validate.errors));
}

const database = {
  async query(sql) {
    if (failDatabase) throw Object.assign(new Error('secret-internal-database-error'), { code: 'ECONNREFUSED' });
    if (sql === 'SELECT 1') return [[{ 1: 1 }]];
    throw new Error(`Unexpected SQL: ${sql}`);
  },
  async execute(sql, values) {
    if (failDatabase) throw Object.assign(new Error('secret-internal-database-error'), { code: 'ECONNREFUSED' });
    if (sql.includes('FROM usuarios WHERE correo')) return [users.filter(user => user.correo === values[0])];
    if (sql.includes('FROM usuarios WHERE id_usuario')) return [users.filter(user => user.id_usuario === values[0])];
    if (sql.includes('COUNT(*)')) {
      const filtered = categories.filter(row => row.activo === values[0] && row.nombre.includes(values[1].slice(1, -1)));
      return [[{ total: filtered.length }]];
    }
    if (sql.includes('FROM categorias WHERE activo')) {
      const [active, pattern, limit, offset] = values;
      assert.equal(typeof limit, 'number');
      assert.equal(typeof offset, 'number');
      return [categories.filter(row => row.activo === active && row.nombre.includes(pattern.slice(1, -1)))
        .sort((a, b) => b.id_categoria - a.id_categoria).slice(offset, offset + limit)];
    }
    if (sql.includes('FROM categorias WHERE id_categoria')) return [categories.filter(row => row.id_categoria === values[0])];
    if (sql.startsWith('INSERT INTO categorias')) {
      writes++;
      if (categories.some(row => row.nombre.toLowerCase() === values[0].toLowerCase())) {
        throw Object.assign(new Error('private duplicate details'), { code: 'ER_DUP_ENTRY' });
      }
      const id = Math.max(0, ...categories.map(row => row.id_categoria)) + 1;
      categories.push({ id_categoria: id, nombre: values[0], descripcion: values[1], activo: 1 });
      return [{ insertId: id }];
    }
    if (sql.startsWith('UPDATE categorias SET nombre')) {
      writes++;
      const [nombre, descripcion, activo, id] = values;
      if (categories.some(row => row.id_categoria !== id && row.nombre.toLowerCase() === nombre.toLowerCase())) {
        throw Object.assign(new Error('private duplicate details'), { code: 'ER_DUP_ENTRY' });
      }
      Object.assign(categories.find(row => row.id_categoria === id), { nombre, descripcion,
        activo: activo ?? categories.find(row => row.id_categoria === id).activo });
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('UPDATE categorias SET activo = 0')) {
      writes++;
      categories.find(row => row.id_categoria === values[0]).activo = 0;
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  }
};

before(async () => {
  hash = await bcrypt.hash(credentials.password, 12);
  app = createApp({ pool: database, jwtSecret: secret });
  document = await SwaggerParser.validate(structuredClone(swagger));
});

after(() => defaultPool.end());

beforeEach(() => {
  users = [
    { id_usuario: 1, nombre: 'Admin de prueba', ...credentials, password: hash, rol: 'ADMIN', activo: 1, fecha_creacion: null },
    { id_usuario: 2, nombre: 'Vendedor de prueba', correo: 'vendedor@example.com', password: hash, rol: 'VENDEDOR', activo: 1, fecha_creacion: null }
  ];
  categories = [
    { id_categoria: 1, nombre: 'Analgésicos', descripcion: null, activo: 1 },
    { id_categoria: 2, nombre: 'Archivada', descripcion: null, activo: 0 }
  ];
  failDatabase = false;
  writes = 0;
});

test('OpenAPI 3.0.3 válido, sin rutas inexistentes y con Bearer en categorías', () => {
  assert.equal(swagger.openapi, '3.0.3');
  assert.equal(swagger.paths['/health'], undefined);
  assert.ok(swagger.paths['/api/usuarios'].post);
  assert.equal(swagger.components.securitySchemes.bearerAuth.scheme, 'bearer');
  for (const [path, methods] of Object.entries(swagger.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (method === 'parameters') continue;
      assert.ok(operation.tags.length);
      assert.ok(operation.summary);
      if (path.startsWith('/api/categorias') || path.startsWith('/api/productos')) {
        assert.deepEqual(operation.security, [{ bearerAuth: [] }]);
      }
    }
  }
});

test('Swagger UI, especificación JSON, raíz y salud disponibles', async () => {
  await request(app).get('/api-docs/').expect(200).expect('Content-Type', /html/);
  const spec = await request(app).get('/api-docs.json').expect(200);
  assert.equal(spec.body.openapi, '3.0.3');
  for (const path of ['/', '/api/health', '/api/health/db']) {
    const response = await request(app).get(path).expect(200);
    checkContract(path, 'get', 200, response.body);
  }
});

test('login y me cumplen contrato, sin contraseña ni hash', async () => {
  const response = await request(app).post('/api/auth/login').send(credentials).expect(200);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.body.data.usuario.password, undefined);
  assert.equal(response.body.data.expires_in, 3600);
  checkContract('/api/auth/login', 'post', 200, response.body);
  const current = await request(app).get('/api/auth/me').auth(response.body.data.token, { type: 'bearer' }).expect(200);
  assert.equal(current.body.data.rol, 'ADMIN');
  checkContract('/api/auth/me', 'get', 200, current.body);
});

test('credenciales inválidas, correo inexistente y usuario inactivo devuelven el mismo 401', async () => {
  const results = [];
  for (const body of [
    { ...credentials, password: 'clave-equivocada' },
    { ...credentials, correo: 'missing@example.com' }
  ]) results.push((await request(app).post('/api/auth/login').send(body).expect(401)).body);
  users[0].activo = 0;
  results.push((await request(app).post('/api/auth/login').send(credentials).expect(401)).body);
  assert.deepEqual(results[0], results[1]);
  assert.deepEqual(results[1], results[2]);
});

test('login rechaza campos desconocidos, correo inválido y contraseña mayor a 72 bytes', async () => {
  for (const body of [
    { ...credentials, rol: 'ADMIN' }, { ...credentials, correo: 'incorrecto' },
    { ...credentials, password: 'á'.repeat(37) }, {}
  ]) {
    const result = await request(app).post('/api/auth/login').send(body).expect(400);
    checkContract('/api/auth/login', 'post', 400, result.body);
  }
});

test('login limita intentos por IP y devuelve Retry-After', async () => {
  const isolated = createApp({ pool: database, jwtSecret: secret });
  for (let i = 0; i < 10; i++) await request(isolated).post('/api/auth/login').send({}).expect(400);
  const result = await request(isolated).post('/api/auth/login').send({}).expect(429);
  assert.ok(Number(result.headers['retry-after']) > 0);
  checkContract('/api/auth/login', 'post', 429, result.body);
});

test('token ausente, alterado, vencido, algoritmo o audiencia incorrectos son rechazados', async () => {
  const invalid = [undefined, 'alterado', token(1, { expiresIn: -1 }), token(1, { algorithm: 'HS384' }), token(1, { audience: 'other' })];
  for (const value of invalid) {
    const req = request(app).get('/api/categorias');
    if (value) req.auth(value, { type: 'bearer' });
    const result = await req.expect(401);
    checkContract('/api/categorias', 'get', 401, result.body);
  }
});

test('desactivar usuario o cambiar rol revoca permisos con el mismo token', async () => {
  const saved = token();
  users[0].activo = 0;
  await request(app).get('/api/auth/me').auth(saved, { type: 'bearer' }).expect(401);
  users[0].activo = 1;
  users[0].rol = 'VENDEDOR';
  await request(app).post('/api/categorias').auth(saved, { type: 'bearer' }).send({ nombre: 'Nueva' }).expect(403);
  assert.equal(writes, 0);
});

test('vendedor consulta categorías pero no puede crear, editar ni desactivar', async () => {
  const saved = token(2);
  const result = await request(app).get('/api/categorias').auth(saved, { type: 'bearer' }).expect(200);
  checkContract('/api/categorias', 'get', 200, result.body);
  for (const [method, path] of [['post', '/api/categorias'], ['put', '/api/categorias/1'], ['delete', '/api/categorias/1']]) {
    await request(app)[method](path).auth(saved, { type: 'bearer' }).send({ nombre: 'Nueva' }).expect(403);
  }
  assert.equal(writes, 0);
});

test('lista filtra estado y nombre, pagina y representa resultado vacío', async () => {
  const saved = token();
  const active = await request(app).get('/api/categorias').auth(saved, { type: 'bearer' }).expect(200);
  assert.equal(active.body.data.length, 1);
  assert.equal(active.body.data[0].activo, true);
  const inactive = await request(app).get('/api/categorias?activo=false&search=Archiv').auth(saved, { type: 'bearer' }).expect(200);
  assert.equal(inactive.body.data[0].id_categoria, 2);
  const empty = await request(app).get('/api/categorias?page=2&limit=1').auth(saved, { type: 'bearer' }).expect(200);
  assert.deepEqual(empty.body.data, []);
  assert.equal(empty.body.pagination.total, 1);
  const missing = await request(app).get('/api/categorias?search=no-existe').auth(saved, { type: 'bearer' }).expect(200);
  assert.equal(missing.body.pagination.total_pages, 0);
});

test('query inválida o desconocida es rechazada antes de escribir', async () => {
  for (const query of ['page=0', 'limit=101', 'page=1.5', 'page=1000001', 'activo=1', 'extra=true', 'page=1&page=2', 'search[x]=1']) {
    await request(app).get(`/api/categorias?${query}`).auth(token(), { type: 'bearer' }).expect(400);
  }
  assert.equal(writes, 0);
});

test('crear, consultar, actualizar, desactivar y reactivar conservan la fila', async () => {
  const saved = token();
  const result = await request(app).post('/api/categorias').auth(saved, { type: 'bearer' })
    .send({ nombre: '  Vitaminas  ', descripcion: 'Suplementos' }).expect(201);
  assert.equal(result.body.data.nombre, 'Vitaminas');
  assert.equal(result.headers.location, '/api/categorias/3');
  checkContract('/api/categorias', 'post', 201, result.body);
  const get = await request(app).get('/api/categorias/3').auth(saved, { type: 'bearer' }).expect(200);
  checkContract('/api/categorias/{id}', 'get', 200, get.body);
  const update = await request(app).put('/api/categorias/3').auth(saved, { type: 'bearer' }).send({ nombre: 'Suplementos' }).expect(200);
  assert.equal(update.body.data.descripcion, null);
  checkContract('/api/categorias/{id}', 'put', 200, update.body);
  for (let i = 0; i < 2; i++) {
    const deleted = await request(app).delete('/api/categorias/3').auth(saved, { type: 'bearer' }).expect(204);
    assert.equal(deleted.text, '');
  }
  assert.equal(categories.length, 3);
  assert.equal(categories[2].activo, 0);
  const unchanged = await request(app).put('/api/categorias/3').auth(saved, { type: 'bearer' }).send({ nombre: 'Suplementos' }).expect(200);
  assert.equal(unchanged.body.data.activo, false);
  const restored = await request(app).put('/api/categorias/3').auth(saved, { type: 'bearer' }).send({ nombre: 'Suplementos', activo: true }).expect(200);
  assert.equal(restored.body.data.activo, true);
});

test('nombres duplicados al crear y editar devuelven 409 sin detalles SQL', async () => {
  for (const [method, path] of [['post', '/api/categorias'], ['put', '/api/categorias/2']]) {
    const result = await request(app)[method](path).auth(token(), { type: 'bearer' }).send({ nombre: 'Analgésicos' }).expect(409);
    checkContract(path.endsWith('/2') ? '/api/categorias/{id}' : '/api/categorias', method, 409, result.body);
    assert.equal(JSON.stringify(result.body).includes('private'), false);
  }
});

test('identificadores inválidos e inexistentes, campos vacíos, largos o desconocidos', async () => {
  for (const id of ['0', '-1', 'abc', '1.2', '9007199254740992']) {
    await request(app).get(`/api/categorias/${id}`).auth(token(), { type: 'bearer' }).expect(400);
  }
  for (const method of ['get', 'put', 'delete']) {
    const req = request(app)[method]('/api/categorias/999').auth(token(), { type: 'bearer' });
    if (method === 'put') req.send({ nombre: 'Nueva' });
    await req.expect(404);
  }
  for (const body of [{}, { nombre: ' ' }, { nombre: 'x'.repeat(101) }, { nombre: 'Nueva', descripcion: 'x'.repeat(256) }, { nombre: 'Nueva', activo: true }]) {
    await request(app).post('/api/categorias').auth(token(), { type: 'bearer' }).send(body).expect(400);
  }
  assert.equal(writes, 0);
});

test('JSON inválido y cuerpo excesivo generan errores consistentes', async () => {
  const bad = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{').expect(400);
  checkContract('/api/auth/login', 'post', 400, bad.body);
  const large = await request(app).post('/api/auth/login').send({ value: 'x'.repeat(1024 * 1024) }).expect(413);
  checkContract('/api/auth/login', 'post', 413, large.body);
});

test('caída de MariaDB no expone detalles internos y salud usa 503', async () => {
  failDatabase = true;
  const health = await request(app).get('/api/health/db').expect(503);
  checkContract('/api/health/db', 'get', 503, health.body);
  const products = await request(app).get('/api/productos').auth(token(), { type: 'bearer' }).expect(500);
  checkContract('/api/productos', 'get', 500, products.body);
  const auth = await request(app).get('/api/categorias').auth(token(), { type: 'bearer' }).expect(500);
  assert.equal(JSON.stringify(auth.body).includes('secret-internal'), false);
});

test('CORS permite el frontend local y excluye un origen ajeno', async () => {
  const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:5173').expect(200);
  assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:5173');
  const other = await request(app).get('/api/health').set('Origin', 'https://other.example').expect(200);
  assert.equal(other.headers['access-control-allow-origin'], undefined);
});

test('no hay registro público de usuarios', async () => {
  for (const path of ['/api/auth/register']) {
    const result = await request(app).post(path).send({}).expect(404);
    assert.deepEqual(result.body, { success: false, message: 'Ruta no encontrada', errors: [] });
  }
});

test('el servidor rechaza secretos ausentes o cortos', () => {
  for (const value of [undefined, '', 'corto']) {
    assert.throws(() => createApp({ pool: database, jwtSecret: value }), /JWT_SECRET/);
  }
});
