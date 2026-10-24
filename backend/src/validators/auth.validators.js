const { z } = require('zod');

const password = z.string().min(8).refine(value => Buffer.byteLength(value, 'utf8') <= 72, {
  message: 'La contraseña no puede exceder 72 bytes UTF-8'
});

const login = z.object({
  correo: z.email().max(100).transform(value => value.toLowerCase()),
  password
}).strict();

const admin = z.object({
  nombre: z.string().trim().min(1).max(100),
  correo: z.email().max(100).transform(value => value.toLowerCase()),
  password: password.refine(value => value.length >= 12, {
    message: 'Usa al menos 12 caracteres para el primer administrador'
  })
}).strict();

module.exports = { login, admin };
