const path = require('node:path').posix;
const rutaLocal = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const Client = require('ssh2-sftp-client');
const ErrorApi = require('../utils/error-api');

function leerConfiguracion(env = process.env) {
  const requeridas = ['IMAGE_SFTP_HOST', 'IMAGE_SFTP_USER', 'IMAGE_SFTP_PASSWORD', 'IMAGE_SFTP_DIRECTORY', 'IMAGE_PUBLIC_URL', 'IMAGE_SFTP_HOST_SHA256'];
  if (requeridas.some(clave => !env[clave])) throw new ErrorApi(503, 'Configura el almacenamiento SFTP de imágenes en el servidor');
  let base;
  try { base = new URL(env.IMAGE_PUBLIC_URL); } catch { throw new ErrorApi(503, 'Configuración de URL de imágenes inválida'); }
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash
    || !path.isAbsolute(env.IMAGE_SFTP_DIRECTORY) || !/^[a-f0-9]{64}$/i.test(env.IMAGE_SFTP_HOST_SHA256)) {
    throw new ErrorApi(503, 'Configuración de almacenamiento de imágenes inválida');
  }
  const puerto = Number(env.IMAGE_SFTP_PORT || 22);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) throw new ErrorApi(503, 'Puerto SFTP inválido');
  return {
    urlBase: base.href.replace(/\/$/, ''),
    directorio: env.IMAGE_SFTP_DIRECTORY,
    conexion: {
      host: env.IMAGE_SFTP_HOST, port: puerto, username: env.IMAGE_SFTP_USER, password: env.IMAGE_SFTP_PASSWORD,
      readyTimeout: 15000, hostHash: 'sha256',
      // Rechaza el servidor si su huella no coincide con la configurada.
      hostVerifier: huella => crypto.timingSafeEqual(Buffer.from(huella, 'hex'), Buffer.from(env.IMAGE_SFTP_HOST_SHA256, 'hex'))
    }
  };
}

async function conSftp(operacion) {
  const config = leerConfiguracion();
  const cliente = new Client();
  try {
    await cliente.connect(config.conexion);
    return await operacion(cliente, config);
  } catch (error) {
    if (error instanceof ErrorApi) throw error;
    throw new ErrorApi(502, 'No se pudo acceder al almacenamiento de imágenes');
  } finally {
    await cliente.end().catch(() => {});
  }
}

// Con IMAGE_LOCAL_DIRECTORY las imágenes se guardan en una carpeta del mismo servidor.
function leerConfiguracionLocal(env = process.env) {
  if (!env.IMAGE_PUBLIC_URL) throw new ErrorApi(503, 'Configura IMAGE_PUBLIC_URL en el servidor');
  let base;
  try { base = new URL(env.IMAGE_PUBLIC_URL); } catch { throw new ErrorApi(503, 'Configuración de URL de imágenes inválida'); }
  if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new ErrorApi(503, 'Configuración de URL de imágenes inválida');
  }
  return { urlBase: base.href.replace(/\/$/, ''), directorio: rutaLocal.resolve(env.IMAGE_LOCAL_DIRECTORY) };
}

async function subirArchivo(buffer) {
  const clave = `${crypto.randomUUID()}.webp`;
  if (process.env.IMAGE_LOCAL_DIRECTORY) {
    const config = leerConfiguracionLocal();
    const url = `${config.urlBase}/${clave}`;
    if (url.length > 255) throw new ErrorApi(503, 'La URL de imágenes excede la capacidad de la base de datos');
    try {
      await fs.mkdir(config.directorio, { recursive: true });
      await fs.writeFile(rutaLocal.join(config.directorio, clave), buffer, { mode: 0o644 });
    } catch {
      throw new ErrorApi(502, 'No se pudo guardar la imagen en el servidor');
    }
    return { clave, url };
  }
  return conSftp(async (cliente, config) => {
    const url = `${config.urlBase}/${clave}`;
    if (url.length > 255) throw new ErrorApi(503, 'La URL de imágenes excede la capacidad de la base de datos');
    await cliente.mkdir(config.directorio, true);
    await cliente.put(buffer, path.join(config.directorio, clave));
    return { clave, url };
  });
}

async function eliminarArchivo(clave) {
  if (!/^[0-9a-f-]{36}\.webp$/.test(clave)) throw new ErrorApi(400, 'Identificador de imagen inválido');
  if (process.env.IMAGE_LOCAL_DIRECTORY) return fs.unlink(rutaLocal.join(leerConfiguracionLocal().directorio, clave));
  return conSftp((cliente, config) => cliente.delete(path.join(config.directorio, clave)));
}

module.exports = { subirArchivo, eliminarArchivo };
