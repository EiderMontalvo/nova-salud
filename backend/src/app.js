const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { pool: defaultPool } = require('./config/database');
const createAuthService = require('./services/auth.service');
const createCategoriasService = require('./services/categorias.service');
const createProductosService = require('./services/productos.service');
const { authenticate } = require('./middlewares/auth');
const errorHandler = require('./middlewares/error-handler');
const ApiError = require('./utils/api-error');
const createHealthRoutes = require('./routes/health.routes');
const createProductosRoutes = require('./routes/productos.routes');
const createAuthRoutes = require('./routes/auth.routes');
const createCategoriasRoutes = require('./routes/categorias.routes');

function createApp({ pool = defaultPool, jwtSecret = process.env.JWT_SECRET } = {}) {
  if (typeof jwtSecret !== 'string' || jwtSecret.length < 32) {
    throw new Error('Configura JWT_SECRET con al menos 32 caracteres aleatorios');
  }

  const app = express();
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
    .split(',').map(origin => origin.trim()).filter(Boolean);
  app.disable('x-powered-by');
  app.use(cors({ origin: origins }));
  app.use(express.json({ limit: '1mb' }));

  const authService = createAuthService(pool, jwtSecret);
  const auth = authenticate(authService);
  app.get('/', (req, res) => {
    res.json({ name: 'Nova Salud API', version: '1.0.0', status: 'online' });
  });
  app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/api', createHealthRoutes(pool));
  app.use('/api/productos', createProductosRoutes(createProductosService(pool), auth));
  app.use('/api/auth', createAuthRoutes(authService, auth));
  app.use('/api/categorias', createCategoriasRoutes(createCategoriasService(pool), auth));
  app.use((req, res, next) => next(new ApiError(404, 'Ruta no encontrada')));
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
