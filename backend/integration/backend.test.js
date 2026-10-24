const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const request = require('supertest');
const Parser = require('@apidevtools/swagger-parser');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const sharp = require('sharp');
const createApp = require('../src/app');
const { pool: defaultPool } = require('../src/config/database');
const createImageStorage = require('../src/config/image-storage');
const { today } = require('../src/utils/business-time');

const password = 'password-only-for-tests';
let pool;
let app;
let hash;
let adminToken;
let vendorToken;
let secondVendorToken;
let schema;
let uploaded;
let removed;
const ajv = addFormats(new Ajv({ strict: false }));

function check(method, url, status, body) {
  const contract = schema.paths[url][method].responses[status].content?.['application/json']?.schema;
  if (!contract) { assert.equal(status, 204); return; }
  const validate = ajv.compile(contract);
  assert.equal(validate(body), true, JSON.stringify(validate.errors));
}

function sale(items = [{ id_producto: 1, cantidad: 2 }], extra = {}) {
  return { metodo_pago: 'EFECTIVO', detalles: items, ...extra };
}

async function sell(body = sale(), token = vendorToken, status = 201, targetApp = app) {
  const result = await request(targetApp).post('/api/ventas').auth(token, { type: 'bearer' }).send(body).expect(status);
  check('post', '/api/ventas', status, result.body);
  return result;
}

async function stock(id = 1) {
  const [[row]] = await pool.execute('SELECT stock FROM productos WHERE id_producto = ?', [id]);
  return row.stock;
}

async function counts() {
  const [[row]] = await pool.query('SELECT (SELECT COUNT(*) FROM ventas) AS ventas, (SELECT COUNT(*) FROM detalle_ventas) AS detalles');
  return { ventas: Number(row.ventas), detalles: Number(row.detalles) };
}

describe('API integrada con MariaDB 11.4 aislada', { skip: !process.env.NOVA_TEST_DB_PORT }, () => {
  before(async () => {
    assert.equal(process.env.NOVA_TEST_DB_NAME, 'nova_salud_test');
    const port = Number(process.env.NOVA_TEST_DB_PORT);
    assert.ok(Number.isInteger(port) && port > 0);
    pool = mysql.createPool({ host: '127.0.0.1', port, user: 'nova_test', password: process.env.NOVA_TEST_DB_PASSWORD,
      database: 'nova_salud_test', connectionLimit: 8, timezone: '-05:00' });
    pool.on('connection', connection => connection.query("SET time_zone = '-05:00'"));
    const [[database]] = await pool.query('SELECT DATABASE() AS name');
    assert.equal(database.name, 'nova_salud_test');
    const ddl = fs.readFileSync(path.join(__dirname, '../test/fixtures/schema.sql'), 'utf8');
    for (const sql of ddl.split(';').map(statement => statement.trim()).filter(Boolean)) await pool.query(sql);
    hash = await bcrypt.hash(password, 12);
    schema = await Parser.validate(structuredClone(require('../src/config/swagger')));
    app = createApp({ pool, jwtSecret: 'integration-test-only-secret-at-least-32-characters', imageStorage: {
      async upload(buffer) {
        const metadata = await sharp(buffer).metadata();
        assert.equal(metadata.format, 'webp');
        assert.ok(metadata.width <= 1600 && metadata.height <= 1600);
        uploaded.push(buffer);
        return { key: 'test-generated.webp', url: 'https://images.example.com/test-generated.webp' };
      },
      async remove(key) { removed.push(key); }
    } });
  });

  after(async () => { if (pool) await pool.end(); await defaultPool.end(); });

  beforeEach(async () => {
    uploaded = []; removed = [];
    for (const table of ['detalle_ventas', 'ventas', 'productos', 'clientes', 'categorias', 'usuarios']) await pool.query(`DELETE FROM ${table}`);
    await pool.query("INSERT INTO categorias (id_categoria, nombre) VALUES (1, 'Categoría de prueba')");
    await pool.execute("INSERT INTO usuarios (id_usuario, nombre, correo, password, rol) VALUES (1, 'Admin', 'admin@example.com', ?, 'ADMIN'), (2, 'Vendor', 'vendor@example.com', ?, 'VENDEDOR'), (3, 'Other', 'other@example.com', ?, 'VENDEDOR')", [hash, hash, hash]);
    await pool.query("INSERT INTO clientes (id_cliente, nombre, documento) VALUES (1, 'Cliente de prueba', 'TEST-DOC')");
    await pool.query("INSERT INTO productos (id_producto, id_categoria, codigo, nombre, precio, stock, stock_minimo, fecha_vencimiento, activo) VALUES (1, 1, 'TEST-1', 'Producto uno', 0.10, 10, 5, DATE_ADD(CURDATE(), INTERVAL 5 DAY), 1), (2, 1, 'TEST-2', 'Producto dos', 0.20, 10, 5, NULL, 1), (3, 1, 'EXPIRED', 'Vencido', 2, 10, 5, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 1), (4, 1, 'INACTIVE', 'Inactivo', 2, 10, 5, NULL, 0)");
    const login = async correo => (await request(app).post('/api/auth/login').send({ correo, password }).expect(200)).body.data.token;
    adminToken = await login('admin@example.com');
    vendorToken = await login('vendor@example.com');
    secondVendorToken = await login('other@example.com');
  });

  test('categorías y productos: escrituras reales, duplicados, fechas y eliminación lógica', async () => {
    const category = await request(app).post('/api/categorias').auth(adminToken, { type: 'bearer' }).send({ nombre: 'Nueva' }).expect(201);
    check('post', '/api/categorias', 201, category.body);
    await request(app).post('/api/categorias').auth(adminToken, { type: 'bearer' }).send({ nombre: 'Nueva' }).expect(409);
    const body = { id_categoria: category.body.data.id_categoria, codigo: 'REAL-TEST', nombre: 'Creado', precio: '99999999.99', stock: 0, stock_minimo: 5, fecha_vencimiento: '2028-02-29' };
    const created = await request(app).post('/api/productos').auth(adminToken, { type: 'bearer' }).send(body).expect(201);
    check('post', '/api/productos', 201, created.body);
    assert.equal(created.body.data.precio, '99999999.99');
    assert.equal(created.body.data.fecha_vencimiento, '2028-02-29');
    await request(app).post('/api/productos').auth(adminToken, { type: 'bearer' }).send(body).expect(409);
    const id = created.body.data.id_producto;
    await request(app).put(`/api/productos/${id}`).auth(adminToken, { type: 'bearer' }).send({ ...body, stock: 20 }).expect(200);
    await request(app).delete(`/api/productos/${id}`).auth(adminToken, { type: 'bearer' }).expect(204);
    const current = await request(app).get(`/api/productos/${id}`).auth(vendorToken, { type: 'bearer' }).expect(200);
    assert.equal(current.body.data.activo, false);
    assert.equal(current.body.data.stock, 20);
  });

  test('usuarios: crear con hash, actualizar, bloquear último admin y revocar usuario desactivado', async () => {
    const body = { nombre: 'Nuevo vendedor', correo: 'new@example.com', password, rol: 'VENDEDOR' };
    const created = await request(app).post('/api/usuarios').auth(adminToken, { type: 'bearer' }).send(body).expect(201);
    check('post', '/api/usuarios', 201, created.body);
    assert.equal(created.body.data.password, undefined);
    const id = created.body.data.id_usuario;
    const [[stored]] = await pool.execute('SELECT password FROM usuarios WHERE id_usuario = ?', [id]);
    assert.equal(await bcrypt.compare(password, stored.password), true);
    await request(app).post('/api/usuarios').auth(adminToken, { type: 'bearer' }).send(body).expect(409);
    await request(app).get('/api/usuarios').auth(vendorToken, { type: 'bearer' }).expect(403);
    const list = await request(app).get('/api/usuarios?search=Nuevo').auth(adminToken, { type: 'bearer' }).expect(200);
    check('get', '/api/usuarios', 200, list.body);
    await request(app).put('/api/usuarios/1').auth(adminToken, { type: 'bearer' }).send({ nombre: 'Admin', correo: 'admin@example.com', rol: 'VENDEDOR' }).expect(409);
    await request(app).delete('/api/usuarios/1').auth(adminToken, { type: 'bearer' }).expect(409);
    await request(app).delete('/api/usuarios/2').auth(adminToken, { type: 'bearer' }).expect(204);
    await request(app).get('/api/auth/me').auth(vendorToken, { type: 'bearer' }).expect(401);
    const updated = await request(app).put(`/api/usuarios/${id}`).auth(adminToken, { type: 'bearer' }).send({ ...body, password: 'otra-password-de-prueba', activo: false }).expect(200);
    check('put', '/api/usuarios/{id}', 200, updated.body);
    assert.equal(updated.body.data.activo, false);
  });

  test('clientes: registrar, buscar por documento, editar y rechazar duplicados', async () => {
    const body = { nombre: 'Cliente nuevo', documento: 'CLIENT-TEST', telefono: null, correo: null };
    const created = await request(app).post('/api/clientes').auth(vendorToken, { type: 'bearer' }).send(body).expect(201);
    check('post', '/api/clientes', 201, created.body);
    await request(app).post('/api/clientes').auth(vendorToken, { type: 'bearer' }).send(body).expect(409);
    const list = await request(app).get('/api/clientes?search=CLIENT-TEST').auth(vendorToken, { type: 'bearer' }).expect(200);
    check('get', '/api/clientes', 200, list.body);
    assert.equal(list.body.data.length, 1);
    const id = created.body.data.id_cliente;
    const updated = await request(app).put(`/api/clientes/${id}`).auth(vendorToken, { type: 'bearer' }).send({ nombre: 'Editado' }).expect(200);
    check('put', '/api/clientes/{id}', 200, updated.body);
    assert.equal(updated.body.data.documento, null);
    await request(app).get('/api/clientes/99999').auth(vendorToken, { type: 'bearer' }).expect(404);
  });

  test('venta real calcula 0.10 + 0.20 sin error de redondeo y descuenta stock', async () => {
    const result = await sell(sale([{ id_producto: 1, cantidad: 1 }, { id_producto: 2, cantidad: 1 }], { id_cliente: 1 }));
    assert.equal(result.body.data.total, '0.30');
    assert.equal(result.body.data.id_usuario, 2);
    assert.equal(result.body.data.id_cliente, 1);
    assert.equal(result.body.data.estado, 'COMPLETADA');
    assert.equal(result.body.data.detalles.length, 2);
    assert.equal(result.body.data.detalles[0].precio_unitario, '0.10');
    assert.match(result.body.data.fecha, /-05:00$/);
    assert.equal(await stock(1), 9);
    assert.equal(await stock(2), 9);
    assert.deepEqual(await counts(), { ventas: 1, detalles: 2 });
  });

  test('rechaza precios del cliente, detalles vacíos o duplicados y cantidades inválidas', async () => {
    const invalid = [sale([], {}), sale([{ id_producto: 1, cantidad: 0 }]), sale([{ id_producto: 1, cantidad: -1 }]), sale([{ id_producto: 1, cantidad: 1.5 }]), sale([{ id_producto: 1, cantidad: 1, precio_unitario: '0.01' }]), sale([{ id_producto: 1, cantidad: 1 }, { id_producto: 1, cantidad: 1 }]), sale(undefined, { total: '0.01' }), sale(undefined, { id_usuario: 1 })];
    for (const body of invalid) await sell(body, vendorToken, 400);
    assert.deepEqual(await counts(), { ventas: 0, detalles: 0 });
    assert.equal(await stock(), 10);
  });

  test('inexistente, inactivo, vencido, cliente inexistente y stock insuficiente no dejan datos parciales', async () => {
    for (const [id, status] of [[9999, 404], [3, 409], [4, 409]]) {
      await sell(sale([{ id_producto: 1, cantidad: 1 }, { id_producto: id, cantidad: 1 }]), vendorToken, status);
    }
    await sell(sale([{ id_producto: 1, cantidad: 11 }]), vendorToken, 409);
    await sell(sale(undefined, { id_cliente: 9999 }), vendorToken, 400);
    assert.deepEqual(await counts(), { ventas: 0, detalles: 0 });
    assert.equal(await stock(), 10);
  });

  test('producto que vence hoy se puede vender y total excesivo se rechaza antes de insertar', async () => {
    await pool.query('UPDATE productos SET fecha_vencimiento = CURDATE() WHERE id_producto = 1');
    await sell();
    await pool.query('UPDATE productos SET precio = 99999999.99 WHERE id_producto = 2');
    await sell(sale([{ id_producto: 2, cantidad: 2 }]), vendorToken, 409);
    assert.equal(await stock(2), 10);
    assert.deepEqual(await counts(), { ventas: 1, detalles: 1 });
  });

  test('fallo SQL después del primer detalle revierte venta, detalles y stock', async () => {
    let insertions = 0;
    const failingPool = {
      async getConnection() {
        const connection = await pool.getConnection();
        return {
          beginTransaction: () => connection.beginTransaction(), commit: () => connection.commit(), rollback: () => connection.rollback(), release: () => connection.release(), destroy: () => connection.destroy(),
          execute(sql, values) {
            if (sql.startsWith('INSERT INTO detalle_ventas') && ++insertions === 2) return Promise.reject(Object.assign(new Error('injected failure'), { code: 'TEST_FAILURE' }));
            return connection.execute(sql, values);
          }
        };
      },
      execute: (sql, values) => pool.execute(sql, values)
    };
    const failingApp = createApp({ pool: failingPool, jwtSecret: 'integration-test-only-secret-at-least-32-characters' });
    await sell(sale([{ id_producto: 1, cantidad: 1 }, { id_producto: 2, cantidad: 1 }]), vendorToken, 500, failingApp);
    assert.equal(insertions, 2);
    assert.deepEqual(await counts(), { ventas: 0, detalles: 0 });
    assert.equal(await stock(1), 10);
    assert.equal(await stock(2), 10);
  });

  test('dos ventas simultáneas compiten por el último stock; solo una confirma', async () => {
    await pool.query('UPDATE productos SET stock = 1 WHERE id_producto = 1');
    const requests = [1, 2].map(() => request(app).post('/api/ventas').auth(vendorToken, { type: 'bearer' }).send(sale([{ id_producto: 1, cantidad: 1 }])));
    const results = await Promise.all(requests);
    assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
    assert.equal(await stock(), 0);
    assert.deepEqual(await counts(), { ventas: 1, detalles: 1 });
  });

  test('anulación restaura stock y dos anulaciones simultáneas no lo duplican', async () => {
    const created = await sell();
    const id = created.body.data.id_venta;
    await request(app).patch(`/api/ventas/${id}/anular`).auth(vendorToken, { type: 'bearer' }).expect(403);
    const requests = [1, 2].map(() => request(app).patch(`/api/ventas/${id}/anular`).auth(adminToken, { type: 'bearer' }));
    const results = await Promise.all(requests);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
    const success = results.find(result => result.status === 200);
    check('patch', '/api/ventas/{id}/anular', 200, success.body);
    assert.equal(success.body.data.estado, 'ANULADA');
    assert.equal(await stock(), 10);
    assert.deepEqual(await counts(), { ventas: 1, detalles: 1 });
  });

  test('anular restaura un producto inactivo o vencido y falla sin cambios si el stock se desbordaría', async () => {
    const created = await sell();
    const id = created.body.data.id_venta;
    await pool.query('UPDATE productos SET stock = 2147483647, activo = 0, fecha_vencimiento = DATE_SUB(CURDATE(), INTERVAL 1 DAY) WHERE id_producto = 1');
    await request(app).patch(`/api/ventas/${id}/anular`).auth(adminToken, { type: 'bearer' }).expect(409);
    const [[row]] = await pool.execute('SELECT estado FROM ventas WHERE id_venta = ?', [id]);
    assert.equal(row.estado, 'COMPLETADA');
    await pool.query('UPDATE productos SET stock = 0 WHERE id_producto = 1');
    await request(app).patch(`/api/ventas/${id}/anular`).auth(adminToken, { type: 'bearer' }).expect(200);
    assert.equal(await stock(), 2);
  });

  test('vendedor solo ve sus ventas; administrador puede consultar todas', async () => {
    const created = await sell();
    const id = created.body.data.id_venta;
    await request(app).get(`/api/ventas/${id}`).auth(secondVendorToken, { type: 'bearer' }).expect(403);
    await request(app).get(`/api/ventas/${id}`).auth(adminToken, { type: 'bearer' }).expect(200);
    const list = await request(app).get('/api/ventas').auth(secondVendorToken, { type: 'bearer' }).expect(200);
    check('get', '/api/ventas', 200, list.body);
    assert.equal(list.body.pagination.total, 0);
    await request(app).get('/api/ventas?id_usuario=2').auth(secondVendorToken, { type: 'bearer' }).expect(403);
  });

  test('el detalle conserva precios históricos y los filtros aceptan todo el rango de DATE', async () => {
    const created = await sell();
    await pool.query('UPDATE productos SET precio = 99.99 WHERE id_producto = 1');
    const detail = await request(app).get(`/api/ventas/${created.body.data.id_venta}`).auth(vendorToken, { type: 'bearer' }).expect(200);
    check('get', '/api/ventas/{id}', 200, detail.body);
    assert.equal(detail.body.data.detalles[0].precio_unitario, '0.10');
    assert.equal(detail.body.data.total, '0.20');
    const report = await request(app).get('/api/reportes/ventas?desde=1000-01-01&hasta=9999-12-31').auth(adminToken, { type: 'bearer' }).expect(200);
    check('get', '/api/reportes/ventas', 200, report.body);
    assert.equal(report.body.resumen.cantidad_ventas, 1);
  });

  test('fallo durante la segunda restauración revierte también la primera', async () => {
    const created = await sell(sale([{ id_producto: 1, cantidad: 2 }, { id_producto: 2, cantidad: 2 }]));
    await pool.query('UPDATE productos SET stock = 2147483647 WHERE id_producto = 2');
    await request(app).patch(`/api/ventas/${created.body.data.id_venta}/anular`).auth(adminToken, { type: 'bearer' }).expect(409);
    assert.equal(await stock(1), 8);
    const [[row]] = await pool.execute('SELECT estado FROM ventas WHERE id_venta = ?', [created.body.data.id_venta]);
    assert.equal(row.estado, 'COMPLETADA');
  });

  test('no permite dejar sin administradores ante dos cambios simultáneos', async () => {
    await pool.execute("INSERT INTO usuarios (id_usuario, nombre, correo, password, rol, activo) VALUES (100, 'Other admin', 'secondadmin@example.com', ?, 'ADMIN', 1)", [hash]);
    const second = (await request(app).post('/api/auth/login').send({ correo: 'secondadmin@example.com', password }).expect(200)).body.data.token;
    const requests = [
      request(app).put('/api/usuarios/1').auth(adminToken, { type: 'bearer' }).send({ nombre: 'Admin', correo: 'admin@example.com', rol: 'VENDEDOR' }),
      request(app).put('/api/usuarios/100').auth(second, { type: 'bearer' }).send({ nombre: 'Other admin', correo: 'secondadmin@example.com', rol: 'VENDEDOR' })
    ];
    const results = await Promise.all(requests);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
    const [[row]] = await pool.query("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'ADMIN' AND activo = 1");
    assert.equal(Number(row.total), 1);
  });

  test('inventario usa vistas existentes y se actualiza tras una venta', async () => {
    await sell(sale([{ id_producto: 1, cantidad: 5 }]));
    const low = await request(app).get('/api/inventario/stock-bajo').auth(vendorToken, { type: 'bearer' }).expect(200);
    check('get', '/api/inventario/stock-bajo', 200, low.body);
    assert.ok(low.body.data.some(product => product.id_producto === 1 && product.stock === 5));
    const expiring = await request(app).get('/api/inventario/por-vencer').auth(vendorToken, { type: 'bearer' }).expect(200);
    check('get', '/api/inventario/por-vencer', 200, expiring.body);
    assert.ok(expiring.body.data.some(product => product.id_producto === 1));
    const inventory = await request(app).get('/api/inventario?id_categoria=1').auth(vendorToken, { type: 'bearer' }).expect(200);
    check('get', '/api/inventario', 200, inventory.body);
  });

  test('dashboard y reportes excluyen ventas anuladas de ingresos', async () => {
    const cancelled = await sell();
    await request(app).patch(`/api/ventas/${cancelled.body.data.id_venta}/anular`).auth(adminToken, { type: 'bearer' }).expect(200);
    await sell(sale([{ id_producto: 2, cantidad: 3 }]));
    const summary = await request(app).get('/api/dashboard/resumen').auth(adminToken, { type: 'bearer' }).expect(200);
    check('get', '/api/dashboard/resumen', 200, summary.body);
    assert.equal(summary.body.data.ventas_del_dia, 1);
    assert.equal(summary.body.data.ingresos_del_dia, '0.60');
    assert.equal(summary.body.data.fecha, today());
    const report = await request(app).get('/api/reportes/ventas?limit=1').auth(adminToken, { type: 'bearer' }).expect(200);
    check('get', '/api/reportes/ventas', 200, report.body);
    assert.deepEqual(report.body.resumen, { cantidad_ventas: 2, completadas: 1, anuladas: 1, ingresos: '0.60' });
    assert.equal(report.body.data.length, 1);
    assert.equal(report.body.pagination.total, 2);
    await request(app).get('/api/dashboard/resumen').auth(vendorToken, { type: 'bearer' }).expect(403);
    await request(app).get('/api/reportes/ventas').auth(vendorToken, { type: 'bearer' }).expect(403);
    await request(app).get('/api/reportes/ventas?desde=2026-10-25&hasta=2026-10-24').auth(adminToken, { type: 'bearer' }).expect(400);
  });

  test('subida inspecciona contenido real y recodifica a WebP sin confiar en el nombre', async () => {
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#ffffff' } }).png().toBuffer();
    const response = await request(app).post('/api/productos/1/imagen').auth(adminToken, { type: 'bearer' }).attach('imagen', png, { filename: 'unsafe.php', contentType: 'application/octet-stream' }).expect(200);
    check('post', '/api/productos/{id}/imagen', 200, response.body);
    assert.equal(response.body.data.imagen, 'https://images.example.com/test-generated.webp');
    assert.equal(uploaded.length, 1);
    await request(app).post('/api/productos/1/imagen').auth(adminToken, { type: 'bearer' }).attach('imagen', Buffer.from('<?php system("x"); ?>'), 'fake.jpg').expect(400);
    await request(app).post('/api/productos/1/imagen').auth(vendorToken, { type: 'bearer' }).attach('imagen', png, 'image.png').expect(403);
    await request(app).post('/api/productos/1/imagen').auth(adminToken, { type: 'bearer' }).attach('imagen', Buffer.alloc(5 * 1024 * 1024 + 1), 'big.png').expect(413);
    await request(app).post('/api/productos/1/imagen').auth(adminToken, { type: 'bearer' }).set('Content-Type', 'multipart/form-data').send('invalid multipart').expect(400);
    await request(app).post('/api/productos/1/imagen').auth(adminToken, { type: 'bearer' }).send({}).expect(400);
    assert.equal(uploaded.length, 1);
  });

  test('sin SFTP configurado devuelve 503 sin alterar la referencia existente', async () => {
    const unconfigured = createApp({ pool, jwtSecret: 'integration-test-only-secret-at-least-32-characters', imageStorage: createImageStorage({}) });
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer();
    await request(unconfigured).post('/api/productos/1/imagen').auth(adminToken, { type: 'bearer' }).attach('imagen', png, 'image.png').expect(503);
    const [[row]] = await pool.query('SELECT imagen FROM productos WHERE id_producto = 1');
    assert.equal(row.imagen, null);
  });

  test('todos los endpoints nuevos tienen esquema y rechazan acceso anónimo', async () => {
    for (const url of ['/api/usuarios', '/api/clientes', '/api/ventas', '/api/inventario', '/api/inventario/stock-bajo', '/api/inventario/por-vencer', '/api/dashboard/resumen', '/api/reportes/ventas']) {
      const result = await request(app).get(url).expect(401);
      check('get', url, 401, result.body);
    }
    for (const [url, body] of [['/api/clientes', { nombre: 'X', extra: true }], ['/api/usuarios', { nombre: 'X', correo: 'x@example.com', rol: 'ADMIN', password: 'short' }]]) {
      await request(app).post(url).auth(adminToken, { type: 'bearer' }).send(body).expect(400);
    }
  });
});
