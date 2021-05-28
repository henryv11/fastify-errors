import httpErrors, { HttpError } from '@heviir/http-errors';
import { HTTPMethods } from 'fastify';
import fp from 'fastify-plugin';

export default fp(
  async function fastifyErrors(app) {
    const routeMethods: Record<string, Set<HTTPMethods>> = {};
    app.decorate('errors', httpErrors);
    app.addHook('onRoute', ({ path, method }) => {
      if (routeMethods[path]) (<HTTPMethods[]>[]).concat(method).forEach(routeMethods[path].add);
      else routeMethods[path] = new Set((<HTTPMethods[]>[]).concat(method));
    });
    app.setNotFoundHandler(req => {
      if (routeMethods[req.url] && !routeMethods[req.url].has(req.method as HTTPMethods))
        throw new httpErrors.MethodNotAllowed();
      else throw new httpErrors.NotFound();
    });
    app.setErrorHandler((err, req, res) => {
      app.log.error({ err, req, res }, err.message);
      if (err instanceof HttpError) res.status(err.code).send(err.data?.response || err.message);
      else if (err.validation) res.status(422).send(err.validation);
      else res.status(err.statusCode || 500).send(err.message || 'Internal Server Error');
    });
  },
  { name: 'fastify-errors' },
);

declare module 'fastify' {
  interface FastifyInstance {
    errors: typeof httpErrors;
  }
}
