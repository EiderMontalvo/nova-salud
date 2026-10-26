const API = import.meta.env.VITE_API_URL;

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

  if (respuesta.status === 401) {
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
