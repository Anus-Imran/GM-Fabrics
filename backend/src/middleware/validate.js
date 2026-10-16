/**
 * Validates and coerces req.body / req.query / req.params with zod schemas.
 * Parsed values replace the originals so handlers only ever see clean data.
 */
export const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.params) req.params = schemas.params.parse(req.params);
    if (schemas.query) {
      const parsed = schemas.query.parse(req.query);
      Object.defineProperty(req, "query", { value: parsed, writable: true, configurable: true });
    }
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
    next();
  } catch (err) {
    next(err);
  }
};
