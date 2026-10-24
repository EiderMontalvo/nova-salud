require('dotenv').config();

const app = require('./app');
const { verificarConexion } = require('./config/database');
const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
    console.log('Iniciando servidor...');
    const conectado = await verificarConexion();
    if (!conectado) {
        console.error('No se pudo establecer la conexión a la base de datos.');
        process.exit(1);
    }
    app.listen(PORT, () => {
        console.log(`Servidor: http://localhost:${PORT}`);
        console.log(`Swagger: http://localhost:${PORT}/api-docs`);
    });
}

iniciarServidor();