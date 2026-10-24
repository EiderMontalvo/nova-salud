const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/api-error');

const tokenOptions = { algorithm: 'HS256', issuer: 'nova-salud', audience: 'nova-salud-web' };

function publicUser(row) {
  return {
    id_usuario: row.id_usuario,
    nombre: row.nombre,
    correo: row.correo,
    rol: row.rol,
    activo: Boolean(row.activo),
    fecha_creacion: row.fecha_creacion
  };
}

function createAuthService(pool, secret) {
  // El hash señuelo evita omitir bcrypt cuando el correo no existe.
  const dummyHash = bcrypt.hashSync('nova-salud-invalid-account', 12);

  return {
    async login({ correo, password }) {
      const [rows] = await pool.execute(
        'SELECT id_usuario, nombre, correo, password, rol, activo, fecha_creacion FROM usuarios WHERE correo = ? LIMIT 1',
        [correo]
      );
      const user = rows[0];
      const matches = await bcrypt.compare(password, user?.password || dummyHash);
      if (!user || !user.activo || !matches) throw new ApiError(401, 'Credenciales inválidas');

      return {
        token: jwt.sign({}, secret, { ...tokenOptions, subject: String(user.id_usuario), expiresIn: '1h' }),
        token_type: 'Bearer',
        expires_in: 3600,
        usuario: publicUser(user)
      };
    },

    async authenticate(token) {
      let payload;
      try {
        payload = jwt.verify(token, secret, {
          algorithms: ['HS256'], issuer: tokenOptions.issuer, audience: tokenOptions.audience
        });
      } catch {
        throw new ApiError(401, 'Token inválido o vencido');
      }
      if (typeof payload.sub !== 'string' || !/^[1-9]\d*$/.test(payload.sub)
        || !Number.isSafeInteger(Number(payload.sub))) {
        throw new ApiError(401, 'Token inválido');
      }

      // Consultar el usuario invalida el acceso al desactivarlo o cambiar su rol.
      const [rows] = await pool.execute(
        'SELECT id_usuario, nombre, correo, rol, activo, fecha_creacion FROM usuarios WHERE id_usuario = ? LIMIT 1',
        [Number(payload.sub)]
      );
      if (!rows[0]?.activo) throw new ApiError(401, 'Usuario inactivo o inexistente');
      return publicUser(rows[0]);
    }
  };
}

module.exports = createAuthService;
