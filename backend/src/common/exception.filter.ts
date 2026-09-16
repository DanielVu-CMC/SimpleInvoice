import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const payload =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const details =
      typeof payload === 'object' && payload !== null
        ? (payload as { message?: string | string[]; error?: string })
        : undefined;
    if (statusCode >= 500)
      this.logger.error(
        JSON.stringify({
          event: 'http.error',
          requestId: response.locals.requestId as string | undefined,
          statusCode,
          // Error messages may contain SQL values or credentials. Keep only
          // stack frames for debugging, never the message or error object.
          stackFrames:
            exception instanceof Error
              ? exception.stack
                  ?.split('\n')
                  .filter((line) => /^\s+at /.test(line))
              : undefined,
        }),
      );
    response.status(statusCode).json({
      statusCode,
      message:
        statusCode >= 500
          ? 'Internal server error'
          : (details?.message ?? payload ?? 'Request failed'),
      error:
        details?.error ??
        HttpStatus[statusCode]
          ?.toLowerCase()
          .split('_')
          .map((word) => word[0].toUpperCase() + word.slice(1))
          .join(' ') ??
        'Error',
    });
  }
}
