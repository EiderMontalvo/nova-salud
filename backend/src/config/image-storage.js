const path = require('node:path').posix;
const crypto = require('node:crypto');
const Client = require('ssh2-sftp-client');
const ApiError = require('../utils/api-error');

function createImageStorage(env = process.env) {
  function configuration() {
    const required = ['IMAGE_SFTP_HOST', 'IMAGE_SFTP_USER', 'IMAGE_SFTP_PASSWORD', 'IMAGE_SFTP_DIRECTORY', 'IMAGE_PUBLIC_URL', 'IMAGE_SFTP_HOST_SHA256'];
    if (required.some(key => !env[key])) throw new ApiError(503, 'Configura el almacenamiento SFTP de imágenes en el servidor');
    let base;
    try { base = new URL(env.IMAGE_PUBLIC_URL); } catch { throw new ApiError(503, 'Configuración de URL de imágenes inválida'); }
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash
      || !path.isAbsolute(env.IMAGE_SFTP_DIRECTORY) || !/^[a-f0-9]{64}$/i.test(env.IMAGE_SFTP_HOST_SHA256)) {
      throw new ApiError(503, 'Configuración de almacenamiento de imágenes inválida');
    }
    const port = Number(env.IMAGE_SFTP_PORT || 22);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new ApiError(503, 'Puerto SFTP inválido');
    return {
      base: base.href.replace(/\/$/, ''), directory: env.IMAGE_SFTP_DIRECTORY,
      connection: {
        host: env.IMAGE_SFTP_HOST, port, username: env.IMAGE_SFTP_USER, password: env.IMAGE_SFTP_PASSWORD,
        readyTimeout: 15000, hostHash: 'sha256',
        hostVerifier: hash => crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(env.IMAGE_SFTP_HOST_SHA256, 'hex'))
      }
    };
  }

  async function run(operation) {
    const config = configuration();
    const client = new Client();
    try {
      await client.connect(config.connection);
      return await operation(client, config);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, 'No se pudo acceder al almacenamiento de imágenes');
    } finally {
      await client.end().catch(() => {});
    }
  }

  return {
    async upload(buffer) {
      const key = `${crypto.randomUUID()}.webp`;
      return run(async (client, config) => {
        const url = `${config.base}/${key}`;
        if (url.length > 255) throw new ApiError(503, 'La URL de imágenes excede la capacidad de la base de datos');
        await client.mkdir(config.directory, true);
        await client.put(buffer, path.join(config.directory, key));
        return { key, url };
      });
    },
    async remove(key) {
      if (!/^[0-9a-f-]{36}\.webp$/.test(key)) throw new ApiError(400, 'Identificador de imagen inválido');
      return run((client, config) => client.delete(path.join(config.directory, key)));
    }
  };
}
module.exports = createImageStorage;
