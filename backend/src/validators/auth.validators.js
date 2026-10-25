const { z } = require('zod');
const { correo } = require('./comunes');

// bcrypt ignora lo que pase de 72 bytes, así que se rechaza en vez de truncar.
const password = z.string().min(8).refine(valor => Buffer.byteLength(valor, 'utf8') <= 72, {
  message: 'La contraseña no puede exceder 72 bytes UTF-8'
});
const passwordNueva = password.refine(valor => valor.length >= 12, {
  message: 'La contraseña debe tener al menos 12 caracteres'
});

const login = z.object({ correo, password }).strict();

const primerAdmin = z.object({
  nombre: z.string().trim().min(1).max(100),
  correo,
  password: passwordNueva
}).strict();

module.exports = { login, primerAdmin, passwordNueva };
