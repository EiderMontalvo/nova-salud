const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const ErrorApi = require('../utils/error-api');

const opcionesToken = { algorithm: 'HS256', issuer: 'nova-salud', audience: 'nova-salud-web' };
// Comparar contra un hash falso hace que un correo inexistente tarde lo mismo que uno real.
const hashFalso = bcrypt.hashSync('nova-salud-cuenta-invalida', 12);

function usuarioPublico(fila) {
  return {
    id_usuario: fila.id_usuario,
    nombre: fila.nombre,
    correo: fila.correo,
    rol: fila.rol,
    activo: Boolean(fila.activo),
    fecha_creacion: fila.fecha_creacion
  };
}

async function iniciarSesion({ correo, password }) {
  const [filas] = await pool.execute(
    'SELECT id_usuario, nombre, correo, password, rol, activo, fecha_creacion FROM usuarios WHERE correo = ? LIMIT 1',
    [correo]
  );
  const usuario = filas[0];
  const coincide = await bcrypt.compare(password, usuario?.password || hashFalso);
  if (!usuario || !usuario.activo || !coincide) throw new ErrorApi(401, 'Credenciales inválidas');

  return {
    token: jwt.sign({}, process.env.JWT_SECRET, { ...opcionesToken, subject: String(usuario.id_usuario), expiresIn: '1h' }),
    token_type: 'Bearer',
    expires_in: 3600,
    usuario: usuarioPublico(usuario)
  };
}

async function verificarToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'], issuer: opcionesToken.issuer, audience: opcionesToken.audience
    });
  } catch {
    throw new ErrorApi(401, 'Token inválido o vencido');
  }
  if (typeof payload.sub !== 'string' || !/^[1-9]\d*$/.test(payload.sub) || !Number.isSafeInteger(Number(payload.sub))) {
    throw new ErrorApi(401, 'Token inválido');
  }

  // Se consulta el usuario en cada solicitud para que desactivarlo o cambiar su rol tenga efecto inmediato.
  const [filas] = await pool.execute(
    'SELECT id_usuario, nombre, correo, rol, activo, fecha_creacion FROM usuarios WHERE id_usuario = ? LIMIT 1',
    [Number(payload.sub)]
  );
  if (!filas[0]?.activo) throw new ErrorApi(401, 'Usuario inactivo o inexistente');
  return usuarioPublico(filas[0]);
}

module.exports = { iniciarSesion, verificarToken };
