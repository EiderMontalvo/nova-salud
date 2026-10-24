const express = require('express');
const { rateLimit } = require('express-rate-limit');
const validate = require('../middlewares/validate');
const { login } = require('../validators/auth.validators');
const createAuthController = require('../controllers/auth.controller');

function createAuthRoutes(service, authenticate) {
  const router = express.Router();
  const controller = createAuthController(service);
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { success: false, message: 'Demasiados intentos. Intenta nuevamente en 15 minutos', errors: [] }
  });

  router.post('/login', limiter, validate({ body: login }), controller.login);
  router.get('/me', authenticate, controller.me);
  return router;
}

module.exports = createAuthRoutes;
