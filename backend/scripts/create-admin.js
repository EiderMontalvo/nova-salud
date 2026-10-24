require('dotenv').config({ quiet: true });
const bcrypt = require('bcrypt');
const { pool } = require('../src/config/database');
const { admin } = require('../src/validators/auth.validators');

async function createAdmin({ database = pool, input = {
    nombre: process.env.ADMIN_NOMBRE,
    correo: process.env.ADMIN_CORREO,
    password: process.env.ADMIN_PASSWORD
  } } = {}) {
  const result = admin.safeParse(input);
  if (!result.success) throw new Error('Define ADMIN_NOMBRE, ADMIN_CORREO y ADMIN_PASSWORD (12 caracteres como mínimo, hasta 72 bytes UTF-8)');

  const connection = await database.getConnection();
  let locked = false;
  try {
    // El bloqueo serializa dos ejecuciones simultáneas del bootstrap en esta base.
    const [[{ acquired }]] = await connection.query("SELECT GET_LOCK(CONCAT(DATABASE(), ':bootstrap-admin'), 10) AS acquired");
    locked = acquired === 1;
    if (!locked) throw new Error('Otro proceso está creando el administrador');
    const [existing] = await connection.execute("SELECT id_usuario FROM usuarios WHERE rol = 'ADMIN' LIMIT 1");
    if (existing.length) throw new Error('Ya existe un administrador. No se modificó ningún usuario');

    const { nombre, correo, password } = result.data;
    const hash = await bcrypt.hash(password, 12);
    await connection.execute(
      "INSERT INTO usuarios (nombre, correo, password, rol, activo) VALUES (?, ?, ?, 'ADMIN', 1)",
      [nombre, correo, hash]
    );
    console.log('Primer administrador creado');
  } finally {
    try {
      if (locked) await connection.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':bootstrap-admin'))");
    } finally {
      connection.release();
    }
  }
}

if (require.main === module) {
  createAdmin().catch(error => {
    console.error(error.code ? `No se pudo crear el administrador (${error.code})` : error.message);
    process.exitCode = 1;
  }).finally(() => pool.end());
}

module.exports = createAdmin;
