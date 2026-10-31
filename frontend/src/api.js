const API = import.meta.env.VITE_API_URL;

// Vite incrusta la variable al compilar; sin ella todas las peticiones fallarían sin una pista clara.
if (!API) console.error('Falta VITE_API_URL: defínela en .env.local o en las variables de entorno de Vercel y vuelve a compilar.');

export async function api(ruta, { method = 'GET', body } = {}) {
  const token = sessionStorage.getItem('token');
  const headers = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const respuesta = await fetch(`${API}${ruta}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body && JSON.stringify(body),
  });

  // Sin token el 401 viene del login (credenciales inválidas) y debe mostrarse como error.
  if (respuesta.status === 401 && token) {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('usuario');
    window.location.href = '/login';
    return;
  }

  if (respuesta.status === 204) return null;

  const json = await respuesta.json();

  if (!json.success) throw json;

  return json;
}

// La API limita cada página a 100 registros; esto recorre todas.
export async function traerTodos(ruta) {
  const separador = ruta.includes('?') ? '&' : '?';
  const primera = await api(`${ruta}${separador}limit=100&page=1`);
  const datos = [...(primera.data || [])];
  const paginas = primera.pagination?.total_pages || 1;

  for (let pagina = 2; pagina <= paginas; pagina++) {
    const res = await api(`${ruta}${separador}limit=100&page=${pagina}`);
    datos.push(...(res.data || []));
  }

  return datos;
}

// Un PUT reemplaza todos los campos, así que se arma desde el producto completo.
export function cuerpoProducto(producto, cambios = {}) {
  const p = { ...producto, ...cambios };
  return {
    id_categoria: Number(p.id_categoria),
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.descripcion || null,
    imagen: p.imagen || null,
    precio: String(p.precio),
    stock: Number(p.stock),
    stock_minimo: Number(p.stock_minimo),
    fecha_vencimiento: p.fecha_vencimiento || null,
    ...(p.activo !== undefined && { activo: Boolean(p.activo) }),
  };
}

export function cuerpoCategoria(categoria, cambios = {}) {
  const c = { ...categoria, ...cambios };
  return {
    nombre: c.nombre,
    descripcion: c.descripcion || null,
    imagen: c.imagen || null,
    ...(c.activo !== undefined && { activo: Boolean(c.activo) }),
  };
}

export async function subirImagen(tipo, id, archivo) {
  const fd = new FormData();
  fd.append('imagen', archivo);
  return api(`/${tipo}/${id}/imagen`, { method: 'POST', body: fd });
}
