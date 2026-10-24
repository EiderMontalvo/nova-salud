function createAuthController(service) {
  return {
    async login(req, res) {
      const data = await service.login(req.validated.body);
      res.set('Cache-Control', 'no-store').json({ success: true, message: 'Inicio de sesión correcto', data });
    },
    me(req, res) {
      res.set('Cache-Control', 'no-store').json({ success: true, message: 'Usuario autenticado', data: req.user });
    }
  };
}

module.exports = createAuthController;
