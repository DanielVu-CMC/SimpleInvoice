import {
  ForbiddenException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './common/exception.filter';
export function setupApplication(app: INestApplication) {
  const config = app.get(ConfigService);
  const origins = config
    .getOrThrow<string>('CORS_ORIGIN')
    .split(',')
    .map((origin) => origin.trim());
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.enableCors({
    origin: origins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      (req.get('X-Requested-With') !== 'SimpleInvoice' ||
        (req.get('Origin') && !origins.includes(req.get('Origin')!)))
    ) {
      res.status(403).json({
        statusCode: 403,
        message: 'Missing request header or untrusted origin',
        error: 'Forbidden',
      });
      return;
    }
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      validationError: { target: false, value: false },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  const options = new DocumentBuilder()
    .setTitle('SimpleInvoice API')
    .setDescription(
      'Assessment API. Mutations require X-Requested-With: SimpleInvoice. Authorize with a JWT bearer token, or log in to set the HttpOnly cookie. All money values in responses are exact decimal strings.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addCookieAuth('access_token')
    .addGlobalParameters({
      in: 'header',
      name: 'X-Requested-With',
      required: true,
      schema: { type: 'string', default: 'SimpleInvoice' },
    })
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: false },
  });
  return document;
}
