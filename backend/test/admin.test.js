const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const createAdmin = require('../scripts/create-admin');
const { pool } = require('../src/config/database');

const input = { nombre: 'Admin de prueba', correo: 'admin@example.com', password: 'contraseña-de-prueba' };

function databaseFixture({ acquired = 1, existing = [], insertError } = {}) {
  const calls = [];
  let released = false;
  return {
    calls,
    get released() { return released; },
    async getConnection() {
      return {
        async query(sql) {
          calls.push({ sql });
          if (sql.includes('GET_LOCK')) return [[{ acquired }]];
          if (sql.includes('RELEASE_LOCK')) return [[{ released: 1 }]];
          throw new Error('SQL inesperado');
        },
        async execute(sql, values) {
          calls.push({ sql, values });
          if (sql.startsWith('SELECT')) return [existing];
          if (insertError) throw insertError;
          return [{ insertId: 1 }];
        },
        release() { released = true; }
      };
    }
  };
}

after(() => pool.end());

test('bootstrap valida datos antes de obtener conexión', async () => {
  await assert.rejects(createAdmin({ input: {}, database: {
    getConnection() { assert.fail('No debe conectarse con datos inválidos'); }
  } }), /Define ADMIN_NOMBRE/);
});

test('bootstrap inserta ADMIN activo con bcrypt de costo 12 y libera bloqueo', async () => {
  const database = databaseFixture();
  await createAdmin({ input, database });
  const insert = database.calls.find(call => call.sql.startsWith('INSERT'));
  assert.ok(insert.sql.includes("'ADMIN', 1"));
  assert.equal(insert.values[0], input.nombre);
  assert.notEqual(insert.values[2], input.password);
  assert.equal(bcrypt.getRounds(insert.values[2]), 12);
  assert.equal(await bcrypt.compare(input.password, insert.values[2]), true);
  assert.ok(database.calls.at(-1).sql.includes('RELEASE_LOCK'));
  assert.equal(database.released, true);
});

test('bootstrap no inserta ni sobrescribe si ya existe un ADMIN', async () => {
  const database = databaseFixture({ existing: [{ id_usuario: 1 }] });
  await assert.rejects(createAdmin({ input, database }), /Ya existe un administrador/);
  assert.equal(database.calls.some(call => call.sql.startsWith('INSERT')), false);
  assert.ok(database.calls.at(-1).sql.includes('RELEASE_LOCK'));
  assert.equal(database.released, true);
});

test('bootstrap no escribe si otro proceso tiene el bloqueo', async () => {
  const database = databaseFixture({ acquired: 0 });
  await assert.rejects(createAdmin({ input, database }), /Otro proceso/);
  assert.equal(database.calls.length, 1);
  assert.equal(database.released, true);
});

test('bootstrap libera bloqueo y conexión si falla INSERT', async () => {
  const error = Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' });
  const database = databaseFixture({ insertError: error });
  await assert.rejects(createAdmin({ input, database }), { code: 'ER_DUP_ENTRY' });
  assert.ok(database.calls.at(-1).sql.includes('RELEASE_LOCK'));
  assert.equal(database.released, true);
});
