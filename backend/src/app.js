const express = require('express');
const cors = require('cors');
const ErrorApi = require('./utils/error-api');
const manejarErrores = require('./middlewares/manejador-errores');

function crearApp() {
  if (typeof process.env.JWT_SECRET !== 'string' || process.env.JWT_SECRET.length < 32) {
    throw new Error('Configura JWT_SECRET con al menos 32 caracteres aleatorios');
  }

  const app = express();
  const origenes = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
    .split(',').map(origen => origen.trim()).filter(Boolean);

  app.disable('x-powered-by');
  app.use(cors({ origin: origenes }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (req, res) => res.json({ name: 'Nova Salud API', version: '1.0.0', status: 'online' }));
  app.use('/api', require('./routes/salud.routes'));
  app.use('/api/auth', require('./routes/auth.routes'));
  app.use('/api/usuarios', require('./routes/usuarios.routes'));
  app.use('/api/categorias', require('./routes/categorias.routes'));
  app.use('/api/productos', require('./routes/productos.routes'));
  app.use('/api/clientes', require('./routes/clientes.routes'));
  app.use('/api/ventas', require('./routes/ventas.routes'));
  app.use('/api/inventario', require('./routes/inventario.routes'));
  app.use('/api/dashboard', require('./routes/dashboard.routes'));
  app.use('/api/reportes', require('./routes/reportes.routes'));

  app.use((req, res, next) => next(new ErrorApi(404, 'Ruta no encontrada')));
  app.use(manejarErrores);
  return app;
}

module.exports = crearApp;
