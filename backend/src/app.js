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
const createUsuariosService = require('./services/usuarios.service');
const createClientesService = require('./services/clientes.service');
const createVentasService = require('./services/ventas.service');
const createInventarioService = require('./services/inventario.service');
const createImagenesService = require('./services/imagenes.service');
const createImageStorage = require('./config/image-storage');
const createUsuariosRoutes = require('./routes/usuarios.routes');
const createClientesRoutes = require('./routes/clientes.routes');
const createVentasRoutes = require('./routes/ventas.routes');
const createInventarioRoutes = require('./routes/inventario.routes');
const createInventarioController = require('./controllers/inventario.controller');
const createVentasController = require('./controllers/ventas.controller');
const { requireAdmin } = require('./middlewares/auth');
const validate = require('./middlewares/validate');
const { report } = require('./validators/ventas.validators');

function createApp({ pool = defaultPool, jwtSecret = process.env.JWT_SECRET, imageStorage = createImageStorage() } = {}) {
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
  const products = createProductosService(pool);
  const images = createImagenesService(pool, products, imageStorage);
  const sales = createVentasService(pool);
  const inventory = createInventarioService(pool, products);
  app.use('/api/productos', createProductosRoutes(products, auth, images));
  app.use('/api/auth', createAuthRoutes(authService, auth));
  app.use('/api/categorias', createCategoriasRoutes(createCategoriasService(pool), auth));
  app.use('/api/usuarios', createUsuariosRoutes(createUsuariosService(pool), auth));
  app.use('/api/clientes', createClientesRoutes(createClientesService(pool), auth));
  app.use('/api/ventas', createVentasRoutes(sales, auth));
  app.use('/api/inventario', createInventarioRoutes(inventory, auth));
  app.get('/api/dashboard/resumen', auth, requireAdmin, createInventarioController(inventory).summary);
  app.get('/api/reportes/ventas', auth, requireAdmin, validate({ query: report }), createVentasController(sales).report);
  app.use((req, res, next) => next(new ApiError(404, 'Ruta no encontrada')));
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
