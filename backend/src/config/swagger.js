
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.3',

    info: {
      title: 'Nova Salud API',
      version: '1.0.0',
      description:
        'API REST para la gestion de inventario y ventas de la botica Nova Salud'
    },

    servers: [
      {
        url: '/',
        description: 'Servidor actual'
      }
    ],

    tags: [
      {
        name: 'Sistema',
        description: 'Estado de la API'
      },
      {
        name: 'Productos',
        description: 'Gestion de productos'
      }
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },

  apis: [
    path.join(__dirname, '../routes/*.js')
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
