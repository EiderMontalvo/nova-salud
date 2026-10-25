class ErrorApi extends Error {
  constructor(estado, mensaje, errores = []) {
    super(mensaje);
    this.estado = estado;
    this.errores = errores;
  }
}

module.exports = ErrorApi;
