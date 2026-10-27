// Los errores de validación de la API traen el detalle en `errors` como { field: 'body.precio', message }.
export function mensajeError(err, porDefecto) {
  if (err instanceof TypeError) return 'No se pudo conectar con el servidor. Revisa tu conexión.';
  const detalle = err?.errors?.[0];
  if (detalle?.message) {
    const campo = detalle.field?.replace(/^(body|query|params)\./, '').replace(/_/g, ' ');
    return campo ? `Revisa el campo «${campo}»: ${detalle.message}` : detalle.message;
  }
  return err?.message || porDefecto;
}
