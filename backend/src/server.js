require('dotenv').config({ quiet: true });

const crearApp = require('./app');
const { verificarConexion } = require('./config/database');

const PUERTO = process.env.PORT || 3000;

async function iniciarServidor() {
  const app = crearApp();
  console.log('Iniciando servidor...');
  if (!(await verificarConexion())) {
    console.error('No se pudo establecer la conexión a la base de datos.');
    process.exit(1);
  }
  app.listen(PUERTO, () => console.log(`Servidor: http://localhost:${PUERTO}`));
}

iniciarServidor().catch(error => {
  console.error('No se pudo iniciar el servidor:', error.message);
  process.exit(1);
});
