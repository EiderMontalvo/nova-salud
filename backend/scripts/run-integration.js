const { execFileSync, spawn } = require('node:child_process');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const path = require('node:path');

async function main() {
  const name = `nova-salud-test-${crypto.randomBytes(6).toString('hex')}`;
  const password = crypto.randomBytes(32).toString('hex');
  let containerCreated = false;
  try {
    console.log('Iniciando MariaDB 11.4 aislada para pruebas de integración...');
    execFileSync('docker', ['run', '--rm', '-d', '--name', name,
      '-p', '127.0.0.1::3306', '-e', 'MARIADB_RANDOM_ROOT_PASSWORD=1', '-e', 'MARIADB_DATABASE=nova_salud_test',
      '-e', 'MARIADB_USER=nova_test', '-e', `MARIADB_PASSWORD=${password}`, 'mariadb:11.4', '--default-time-zone=-05:00'], { stdio: ['ignore', 'pipe', 'pipe'] });
    containerCreated = true;
    const mapping = execFileSync('docker', ['port', name, '3306/tcp'], { encoding: 'utf8' }).trim();
    const port = Number(mapping.split(':').at(-1));
    let ready = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      try {
        const connection = await mysql.createConnection({ host: '127.0.0.1', port, user: 'nova_test', password, database: 'nova_salud_test', connectTimeout: 1000 });
        await connection.end(); ready = true; break;
      } catch { await new Promise(resolve => setTimeout(resolve, 500)); }
    }
    if (!ready) throw new Error('MariaDB de pruebas no inició a tiempo');
    const child = spawn(process.execPath, ['--test', 'integration/backend.test.js'], {
      cwd: path.join(__dirname, '..'), stdio: 'inherit',
      env: { ...process.env, NOVA_TEST_DB_PORT: String(port), NOVA_TEST_DB_PASSWORD: password, NOVA_TEST_DB_NAME: 'nova_salud_test' }
    });
    const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
    process.exitCode = code ?? 1;
  } finally {
    if (containerCreated) execFileSync('docker', ['rm', '-f', name], { stdio: 'ignore' });
  }
}
main().catch(error => {
  console.error('No se pudo ejecutar la integración:', error.code || error.name);
  process.exitCode = 1;
});
