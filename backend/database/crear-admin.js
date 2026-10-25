require('dotenv').config({ quiet: true });
const bcrypt = require('bcrypt');
const { pool } = require('../src/config/database');
const { primerAdmin } = require('../src/validators/auth.validators');

async function crearPrimerAdmin() {
  const resultado = primerAdmin.safeParse({
    nombre: process.env.ADMIN_NOMBRE,
    correo: process.env.ADMIN_CORREO,
    password: process.env.ADMIN_PASSWORD
  });
  if (!resultado.success) throw new Error('Define ADMIN_NOMBRE, ADMIN_CORREO y ADMIN_PASSWORD (mínimo 12 caracteres) en el .env');

  const conexion = await pool.getConnection();
  let bloqueado = false;
  try {
    // GET_LOCK evita que dos ejecuciones simultáneas creen dos administradores.
    const [[{ obtenido }]] = await conexion.query("SELECT GET_LOCK(CONCAT(DATABASE(), ':primer-admin'), 10) AS obtenido");
    bloqueado = obtenido === 1;
    if (!bloqueado) throw new Error('Otro proceso está creando el administrador');
    const [existentes] = await conexion.execute("SELECT id_usuario FROM usuarios WHERE rol = 'ADMIN' LIMIT 1");
    if (existentes.length) throw new Error('Ya existe un administrador. No se modificó ningún usuario');

    const { nombre, correo, password } = resultado.data;
    await conexion.execute(
      "INSERT INTO usuarios (nombre, correo, password, rol, activo) VALUES (?, ?, ?, 'ADMIN', 1)",
      [nombre, correo, await bcrypt.hash(password, 12)]
    );
    console.log('Primer administrador creado');
  } finally {
    if (bloqueado) await conexion.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':primer-admin'))").catch(() => {});
    conexion.release();
  }
}

crearPrimerAdmin()
  .catch(error => {
    console.error(error.code ? `No se pudo crear el administrador (${error.code})` : error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
