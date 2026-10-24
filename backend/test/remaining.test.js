const { test } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { cents, amount } = require('../src/utils/money');
const transaction = require('../src/utils/transaction');
const createImages = require('../src/services/imagenes.service');
const createStorage = require('../src/config/image-storage');
const validators = require('../src/validators/ventas.validators');

test('importes exactos, máximo DECIMAL y rechazo de precios inválidos', () => {
  assert.equal(amount(cents('0.10') + cents('0.20')), '0.30');
  assert.equal(amount(9999999999n), '99999999.99');
  for (const value of [-1n, 10000000000n]) assert.throws(() => amount(value), { status: 409 });
  for (const value of ['-1', '0.001', 'NaN']) assert.throws(() => cents(value), { status: 409 });
});

test('si falla rollback se descarta y libera conexión sin ocultar el error original', async () => {
  let destroyed = false;
  let released = false;
  const expected = new Error('original failure');
  const pool = { async getConnection() { return {
    async beginTransaction() {}, async rollback() { throw new Error('rollback failure'); },
    destroy() { destroyed = true; }, release() { released = true; }
  }; } };
  await assert.rejects(transaction(pool, () => { throw expected; }), error => error === expected);
  assert.equal(destroyed, true);
  assert.equal(released, true);
});

test('fallo de commit intenta rollback y libera conexión', async () => {
  const events = [];
  const pool = { async getConnection() { return {
    async beginTransaction() { events.push('begin'); },
    async commit() { throw new Error('commit failure'); },
    async rollback() { events.push('rollback'); },
    release() { events.push('release'); }
  }; } };
  await assert.rejects(transaction(pool, async () => 'result'), /commit failure/);
  assert.deepEqual(events, ['begin', 'rollback', 'release']);
});

test('venta rechaza más de 100 detalles, fecha imposible y rango invertido', () => {
  assert.equal(validators.create.safeParse({ metodo_pago: 'EFECTIVO', detalles: Array.from({ length: 101 }, (_, i) => ({ id_producto: i + 1, cantidad: 1 })) }).success, false);
  assert.equal(validators.query.safeParse({ desde: '2026-02-30' }).success, false);
  assert.equal(validators.report.safeParse({ desde: '2026-10-25', hasta: '2026-10-24' }).success, false);
});

test('imagen subida se limpia si guardar la referencia falla', async () => {
  const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const removed = [];
  const service = createImages({ async execute() { throw new Error('database failure'); } }, { async getById() { return { id_producto: 1 }; } }, {
    async upload() { return { key: 'owned-file.webp', url: 'https://images.example.com/owned-file.webp' }; },
    async remove(key) { removed.push(key); }
  });
  await assert.rejects(service.upload(1, { buffer }), /database failure/);
  assert.deepEqual(removed, ['owned-file.webp']);
});

test('imagen con SVG o archivo corrupto nunca llega al almacenamiento', async () => {
  let uploads = 0;
  const service = createImages({}, { async getById() { return {}; } }, { async upload() { uploads++; } });
  for (const buffer of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'), Buffer.from('not an image')]) {
    await assert.rejects(service.upload(1, { buffer }), { status: 400 });
  }
  assert.equal(uploads, 0);
});

test('almacenamiento SFTP rechaza configuración incompleta antes de conectar', async () => {
  await assert.rejects(createStorage({}).upload(Buffer.from('test')), { status: 503 });
  await assert.rejects(createStorage({}).remove('../other-file'), { status: 400 });
  const invalid = {
    IMAGE_SFTP_HOST: 'example.com', IMAGE_SFTP_USER: 'test', IMAGE_SFTP_PASSWORD: 'test-only',
    IMAGE_SFTP_DIRECTORY: '/test', IMAGE_PUBLIC_URL: 'http://example.com/images', IMAGE_SFTP_HOST_SHA256: 'a'.repeat(64)
  };
  await assert.rejects(createStorage(invalid).upload(Buffer.from('test')), { status: 503 });
  await assert.rejects(createStorage({ ...invalid, IMAGE_PUBLIC_URL: 'https://example.com/images', IMAGE_SFTP_HOST_SHA256: 'bad' }).upload(Buffer.from('test')), { status: 503 });
});
