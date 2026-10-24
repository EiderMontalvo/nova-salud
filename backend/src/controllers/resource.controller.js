function resourceController(service, { singular, plural, path, feminine = false }) {
  const ending = feminine ? 'a' : 'o';
  return {
    async list(req, res) {
      const result = await service.list(req.validated.query, req.user);
      res.json({ success: true, message: `${plural} obtenid${ending}s`, ...result });
    },
    async get(req, res) {
      const data = await service.get(req.validated.params.id, req.user);
      res.json({ success: true, message: `${singular} obtenid${ending}`, data });
    },
    async create(req, res) {
      const data = await service.create(req.validated.body, req.user);
      res.status(201).location(`${path}/${data[service.idField]}`)
        .json({ success: true, message: `${singular} registrad${ending}`, data });
    },
    async update(req, res) {
      const data = await service.update(req.validated.params.id, req.validated.body, req.user.id_usuario);
      res.json({ success: true, message: `${singular} actualizad${ending}`, data });
    },
    async deactivate(req, res) {
      await service.deactivate(req.validated.params.id, req.user.id_usuario);
      res.status(204).end();
    }
  };
}
module.exports = resourceController;
