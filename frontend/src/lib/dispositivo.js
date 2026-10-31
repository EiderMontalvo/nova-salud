// Con mouse o trackpad conviene enfocar la búsqueda al entrar; en táctil abriría el teclado y taparía la pantalla.
export function tieneMouse() {
  return window.matchMedia?.('(pointer: fine)').matches ?? true;
}
