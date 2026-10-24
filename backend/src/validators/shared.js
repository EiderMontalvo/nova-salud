const { z } = require('zod');

const id = z.number().int().min(1).max(2147483647);
const queryId = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(id);
const params = z.object({ id: queryId });
const pagination = {
  page: queryId.refine(value => value <= 1000000).default(1),
  limit: queryId.refine(value => value <= 100).default(20)
};
const list = z.object({ ...pagination, search: z.string().trim().max(100).default('') }).strict();
const date = z.iso.date().refine(value => value >= '1000-01-01');

module.exports = { id, queryId, params, pagination, list, date };
