const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const modules = require('../docs/modules');

module.exports = swaggerJsdoc({
  failOnErrors: true,
  definition: {
    paths: modules.paths,
    openapi: '3.0.3',
    info: {
      title: 'Nova Salud API',
      version: '1.0.0',
      description: 'API de Nova Salud para usuarios, categorías, productos, clientes, ventas, inventario, dashboard y reportes. Inicia sesión en POST /api/auth/login y pega el token en Authorize. Las operaciones de negocio requieren JWT y los permisos se detallan por endpoint. Los listados devuelven data y pagination. JSON admite hasta 1 MB; la carga multipart de imágenes, un archivo de hasta 5 MB. Los ejemplos son ilustrativos, no credenciales ni registros existentes.'
    },
    servers: [{ url: '/', description: 'Servidor actual' }],
    tags: [
      { name: 'Sistema', description: 'Estado de la API y de MariaDB' },
      { name: 'Autenticación', description: 'Inicio de sesión y usuario actual' },
      { name: 'Categorías', description: 'Consulta y administración de categorías' },
      { name: 'Productos', description: 'Consulta y administración de productos' },
      { name: 'Usuarios', description: 'Administración de usuarios y roles' },
      { name: 'Clientes', description: 'Gestión de clientes' },
      { name: 'Ventas', description: 'Registro y anulación de ventas' },
      { name: 'Inventario', description: 'Existencias y alertas' },
      { name: 'Dashboard', description: 'Resumen operativo del día' },
      { name: 'Reportes', description: 'Reportes básicos de ventas' }
    ],
    components: {
      schemas: modules.components.schemas,
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }
    }
  },
  apis: [path.join(__dirname, '../docs/*.yaml')]
});
