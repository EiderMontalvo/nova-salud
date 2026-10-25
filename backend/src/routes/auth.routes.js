const express = require('express');
const { rateLimit } = require('express-rate-limit');
const validar = require('../middlewares/validar');
const { autenticar } = require('../middlewares/autenticacion');
const { login } = require('../validators/auth.validators');
const controlador = require('../controllers/auth.controller');

const router = express.Router();

const limitarIntentos = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Demasiados intentos. Intenta nuevamente en 15 minutos', errors: [] }
});

router.post('/login', limitarIntentos, validar({ body: login }), controlador.iniciarSesion);
router.get('/me', autenticar, controlador.perfil);

module.exports = router;
