import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

const logger = new Logger('RequestLog');

export function requestLogging(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Always generate locally: caller-supplied IDs must not control our logs.
  const requestId = randomUUID();
  const started = performance.now();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  let logged = false;
  const complete = () => {
    if (logged) return;
    logged = true;
    const completed = res.writableFinished;
    const statusCode = completed ? res.statusCode : undefined;
    const context = {
      requestId,
      method: req.method,
      // Route templates exclude query strings and attacker-controlled URLs.
      route: (req.route as { path?: string } | undefined)?.path ?? 'unmatched',
      statusCode,
      durationMs: Math.round(performance.now() - started),
      outcome: completed ? 'completed' : 'aborted',
    };
    logger.log(JSON.stringify({ event: 'http.request', ...context }));

    // Express also matches case differences and a trailing slash by default.
    const authPath = req.path.toLowerCase().replace(/\/$/, '');
    let event: string | undefined;
    if (req.method === 'POST' && authPath === '/auth/login') {
      event = !completed
        ? 'auth.login_aborted'
        : statusCode === 200
          ? 'auth.login_success'
          : statusCode === 401
            ? 'auth.login_failure'
            : statusCode! >= 500
              ? 'auth.login_error'
              : 'auth.login_rejected';
    } else if (
      req.method === 'POST' &&
      authPath === '/auth/logout' &&
      statusCode === 204
    ) {
      // Logout clears a cookie; it does not revoke stateless JWTs.
      event = 'auth.logout_cookie_cleared';
    } else if (statusCode === 401) {
      event = 'auth.access_denied';
    }
    if (event) {
      const entry = JSON.stringify({
        event,
        ...context,
        userId: res.locals.authUserId as string | undefined,
      });
      if (
        event === 'auth.login_success' ||
        event === 'auth.logout_cookie_cleared'
      )
        logger.log(entry);
      else logger.warn(entry);
    }
  };
  res.once('finish', complete);
  res.once('close', complete);
  next();
}
