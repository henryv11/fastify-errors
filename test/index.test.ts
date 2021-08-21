import fastify from 'fastify';
import FastifyErrors from '../src';

function getConfiguredApp() {
  const app = fastify({ logger: !{ prettyPrint: true } });
  app.register(FastifyErrors);
  return app;
}

describe('errors', () => {
  test('response output', async () => {
    const app = getConfiguredApp();
    const error = new app.errors.EnhanceYourCalm();
    app.route({
      method: 'GET',
      url: '/',
      handler: () => {
        throw error;
      },
    });
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.body).toEqual(error.message);
    expect(res.statusCode).toEqual(error.code);
  });

  test('405', async () => {
    const app = getConfiguredApp();
    app.route({ method: 'GET', url: '/', handler: (_, res) => void res.send('hello') });
    await app.ready();
    const res = await app.inject({ method: 'POST', url: '/' });
    expect(res.body).toEqual('Method Not Allowed');
  });

  test('404', async () => {
    const app = getConfiguredApp();
    await app.ready();
    const res = await app.inject({ method: 'POST', url: '/' });
    expect(res.body).toEqual('Not Found');
  });
});
