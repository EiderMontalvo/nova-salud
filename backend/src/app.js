const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const healthRoutes = require('./routes/health.routes');
const productosRoutes = require('./routes/productos.routes');

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({limit: '1mb'}));
app.get('/', (req, res) => {
    res.json({name: 'Nova Salud API', version: '1.0.0', status: 'online'});
});
app.use('/api', healthRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use((req, res) => {
    res.status(404).json({message: 'Ruta no encontrada', success: false});
});

module.exports = app;