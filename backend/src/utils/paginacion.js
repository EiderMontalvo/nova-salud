function paginacion(page, limit, total) {
  return { page, limit, total: Number(total), total_pages: Math.ceil(Number(total) / limit) };
}

module.exports = paginacion;
