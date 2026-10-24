const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

module.exports = swaggerJsdoc({
  failOnErrors: true,
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Nova Salud API',
      version: '1.0.0',
      description: 'API de Nova Salud. Para categorías, inicia sesión en POST /api/auth/login y pega el token en Authorize. Roles ADMIN y VENDEDOR pueden consultar; solo ADMIN puede modificar categorías. Productos conserva temporalmente su respuesta original como array y su acceso público. Las solicitudes JSON admiten hasta 1 MB.'
    },
    servers: [{ url: '/', description: 'Servidor actual' }],
    tags: [
      { name: 'Sistema', description: 'Estado de la API y de MariaDB' },
      { name: 'Autenticación', description: 'Inicio de sesión y usuario actual' },
      { name: 'Categorías', description: 'Consulta y administración de categorías' },
      { name: 'Productos', description: 'Consulta inicial de productos activos' }
    ],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }
    }
  },
  apis: [path.join(__dirname, '../docs/*.yaml')]
});
