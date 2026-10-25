const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 10000,
    charset: 'utf8mb4',
    timezone: '-05:00'
});

pool.on('connection', connection => {
    connection.query("SET time_zone = '-05:00'", error => {
        if (error) connection.destroy();
    });
});

async function verificarConexion() {
    try {
        const [rows] = await pool.query('SELECT DATABASE() AS nombre, VERSION() AS version_mariadb');
        console.log('Conexion a la base de datos exitosa. Base de datos actual:', rows[0].nombre);
        console.log('Version de la base de datos:', rows[0].version_mariadb);
        return true;
    } catch (error) {
        console.error('Error al conectar a la base de datos');
        console.error('Codigo de error:', error.code);
        return false;
    }
}

module.exports = { pool, verificarConexion };
