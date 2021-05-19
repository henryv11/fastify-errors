import { FastifyPluginCallback, HTTPMethods } from 'fastify';
import fp from 'fastify-plugin';

const fastifyErrors: FastifyPluginCallback = function (app, _, done) {
  const routeMethods: Record<string, Set<HTTPMethods>> = {};
  app.decorate('errors', errors);
  app.addHook('onRoute', ({ path, method }) => {
    if (routeMethods[path]) new Array<HTTPMethods>().concat(method).forEach(routeMethods[path].add);
    else routeMethods[path] = new Set(new Array<HTTPMethods>().concat(method));
  });
  app.setNotFoundHandler(req => {
    if (routeMethods[req.url] && !routeMethods[req.url].has(req.method as HTTPMethods))
      throw new errors.MethodNotAllowed();
    else throw new errors.NotFound();
  });
  app.setErrorHandler((err, req, res) => {
    app.log.error({ err, req, res }, err.message);
    if (isApiError(err)) res.status(err.code).send(err.data?.response || err.message);
    else if (err.validation) res.status(422).send(err.validation);
    else res.status(err.statusCode || 500).send(err.message || 'Internal Server Error');
  });
  done();
};

export default fp(fastifyErrors);

export abstract class APIError extends Error {
  constructor(
    public code: number,
    message: string,
    public type: keyof typeof errorMap,
    public data?: Record<string | number | symbol, unknown>,
  ) {
    super(message);
    Error.captureStackTrace(this);
  }
}

function isApiError(err: Error): err is APIError {
  return 'code' in err && 'type' in err && 'data' in err && !!errorMap[(err as APIError).type];
}

const errorMap = {
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Duplicate: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  RequestEntityTooLarge: 413,
  RequestURITooLong: 414,
  UnsupportedMediaType: 415,
  RequestedRangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  IAmATeapot: 418,
  EnhanceYourCalm: 420,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  ReservedforWebDAV: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  NoResponse: 444,
  RetryWith: 449,
  BlockedByWindowsParentalControls: 450,
  ClientClosedRequest: 499,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  BandwidthLimitExceeded: 509,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
  NetworkReadTimeout: 598,
  NetworkConnectionTimeout: 599,
};

export const errors = Object.entries(errorMap).reduce((errors, [key, code]) => {
  const message = key.replace(/([A-Z](?=[a-z]+)|[A-Z]+(?![a-z]))/g, ' $1').trim();
  errors[key as keyof typeof errorMap] = class extends APIError {
    constructor(public data?: Record<string | number | symbol, unknown>) {
      super(code, message, key as keyof typeof errorMap, data);
    }
  };
  return errors;
}, {} as Record<keyof typeof errorMap, { new (data?: Record<string | number | symbol, unknown>): APIError }>);

declare module 'fastify' {
  interface FastifyInstance {
    errors: typeof errors;
  }
}
