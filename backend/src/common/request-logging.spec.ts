import 'reflect-metadata';
import {
  INestApplication,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { setupApplication } from '../setup';

const headers = { 'X-Requested-With': 'SimpleInvoice' };
const credentials = {
  email: 'private@example.com',
  password: 'private-password',
};

describe('Request and authentication logging', () => {
  let app: INestApplication;
  let entries: Record<string, unknown>[];
  const login = jest.fn();
  const capture = (message: unknown) => {
    if (typeof message === 'string' && message.startsWith('{'))
      entries.push(JSON.parse(message) as Record<string, unknown>);
  };
  beforeAll(async () => {
    entries = [];
    jest.spyOn(Logger.prototype, 'log').mockImplementation(capture);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(capture);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(capture);
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: { login } },
        {
          provide: ConfigService,
          useValue: new ConfigService({
            CORS_ORIGIN: 'http://localhost:5180',
            COOKIE_SECURE: 'false',
          }),
        },
      ],
    }).compile();
    app = module.createNestApplication();
    setupApplication(app);
    await app.init();
  });
  beforeEach(() => {
    entries = [];
    login.mockReset().mockResolvedValue({
      accessToken: 'private-jwt',
      expiresIn: 3600,
      user: { id: 'user-id' },
    });
  });
  afterAll(async () => {
    await app?.close();
    jest.restoreAllMocks();
  });

  it('correlates concurrent requests with unique server-generated UUIDs and excludes secrets', async () => {
    const responses = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post('/auth/login?secret=private-query')
          .set(headers)
          .set('X-Request-ID', 'caller-controlled')
          .set('Cookie', 'access_token=private-cookie')
          .set('Authorization', 'Bearer private-bearer')
          .send(credentials),
      ),
    );
    const ids = responses.map(
      (response) => response.headers['x-request-id'] as string,
    );
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) {
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      const logs = entries.filter((entry) => entry.requestId === id);
      expect(logs).toHaveLength(2);
      expect(logs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: 'http.request',
            statusCode: 200,
            route: '/auth/login',
          }),
          expect.objectContaining({
            event: 'auth.login_success',
            userId: 'user-id',
          }),
        ]),
      );
    }
    expect(JSON.stringify(entries)).not.toMatch(
      /private-|caller-controlled|private@example/,
    );
  });

  it('records bad credentials without logging the submitted identity', async () => {
    login.mockRejectedValue(
      new UnauthorizedException('Invalid email or password'),
    );
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set(headers)
      .send(credentials);
    expect(response.status).toBe(401);
    expect(entries).toContainEqual(
      expect.objectContaining({
        event: 'auth.login_failure',
        requestId: response.headers['x-request-id'],
        statusCode: 401,
      }),
    );
    expect(JSON.stringify(entries)).not.toContain(credentials.email);
  });

  it.each([
    ['validation', 400],
    ['origin', 403],
  ])('records %s rejections before the controller', async (kind, status) => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set(kind === 'validation' ? headers : {})
      .send(kind === 'validation' ? {} : credentials);
    expect(response.status).toBe(status);
    expect(login).not.toHaveBeenCalled();
    expect(entries).toContainEqual(
      expect.objectContaining({
        event: 'auth.login_rejected',
        statusCode: status,
      }),
    );
  });

  it('correlates internal errors without exposing exception messages', async () => {
    login.mockRejectedValue(new Error('private-password private-jwt'));
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set(headers)
      .send(credentials);
    expect(response.status).toBe(500);
    expect(entries).toContainEqual(
      expect.objectContaining({
        event: 'http.error',
        requestId: response.headers['x-request-id'],
      }),
    );
    expect(entries).toContainEqual(
      expect.objectContaining({ event: 'auth.login_error', statusCode: 500 }),
    );
    expect(JSON.stringify(entries)).not.toMatch(/private-password|private-jwt/);
  });

  it('logs logout as cookie clearing without asserting token revocation', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set(headers);
    expect(response.status).toBe(204);
    expect(entries).toContainEqual(
      expect.objectContaining({
        event: 'auth.logout_cookie_cleared',
        statusCode: 204,
      }),
    );
  });

  it('assigns IDs to malformed JSON, unknown routes, and preflight requests', async () => {
    const malformed = await request(app.getHttpServer())
      .post('/auth/login')
      .set(headers)
      .set('Content-Type', 'application/json')
      .send('{');
    expect(malformed.status).toBe(400);
    expect(malformed.headers['x-request-id']).toBeDefined();
    const missing = await request(app.getHttpServer()).get(
      '/private-path?secret=private-query',
    );
    expect(missing.status).toBe(404);
    expect(entries).toContainEqual(
      expect.objectContaining({
        event: 'http.request',
        requestId: missing.headers['x-request-id'],
        route: 'unmatched',
      }),
    );
    const preflight = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'http://localhost:5180')
      .set('Access-Control-Request-Method', 'POST');
    expect(preflight.status).toBe(204);
    expect(preflight.headers['x-request-id']).toBeDefined();
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set(headers)
      .set('Origin', 'http://localhost:5180')
      .send(credentials);
    expect(response.headers['access-control-expose-headers']).toContain(
      'X-Request-ID',
    );
    expect(JSON.stringify(entries)).not.toMatch(/private-path|private-query/);
  });
});
