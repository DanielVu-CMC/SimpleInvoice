import 'reflect-metadata';
import { validateEnvironment } from './environment';
const required = () => ({
  DATABASE_URL: 'postgresql://test:test@localhost:5432/invoice_test',
  JWT_SECRET: 'test-only-jwt-secret-long-enough-for-validation',
});
describe('Environment configuration', () => {
  it('defaults token expiration to 3600 seconds', () =>
    expect(validateEnvironment(required()).JWT_EXPIRES_IN).toBe(3600));
  it('converts configurable numeric values', () =>
    expect(
      validateEnvironment({
        ...required(),
        JWT_EXPIRES_IN: '7200',
        APP_PORT: '3456',
      }),
    ).toMatchObject({ JWT_EXPIRES_IN: 7200, APP_PORT: 3456 }));
  it.each(['0', '-1', 'not-a-number'])(
    'rejects invalid expiration %s',
    (JWT_EXPIRES_IN) =>
      expect(() =>
        validateEnvironment({ ...required(), JWT_EXPIRES_IN }),
      ).toThrow(),
  );
  it('requires the secure cookie flag in production', () =>
    expect(() =>
      validateEnvironment({ ...required(), NODE_ENV: 'production' }),
    ).toThrow('COOKIE_SECURE'));
  it('rejects wildcard origins', () =>
    expect(() =>
      validateEnvironment({ ...required(), CORS_ORIGIN: '*' }),
    ).toThrow('CORS_ORIGIN'));
});
