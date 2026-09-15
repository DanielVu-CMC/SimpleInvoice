import {
  IsEmail,
  IsIn,
  IsInt,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import validateConfig from '../utils/validate-config';

class Environment {
  @IsIn(['development', 'test', 'production']) NODE_ENV = 'development';
  @Type(() => Number) @IsInt() @Min(1) @Max(65535) APP_PORT = 3001;
  @IsString() @MinLength(1) DATABASE_URL: string;
  @IsString() @MinLength(32) JWT_SECRET: string;
  @Type(() => Number) @IsInt() @Min(1) JWT_EXPIRES_IN = 3600;
  @IsString() @MinLength(1) CORS_ORIGIN = 'http://localhost:5180';
  @IsIn(['true', 'false']) COOKIE_SECURE = 'false';
  @ValidateIf((_, v) => v !== undefined) @IsEmail() SEED_USER_EMAIL?: string;
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MinLength(1)
  SEED_USER_PASSWORD?: string;
  @IsString() SEED_USER_NAME = 'Alex Morgan';
}

export function validateEnvironment(
  values: Record<string, unknown>,
): Environment {
  const env = validateConfig(values, Environment);
  if (!/^postgres(ql)?:\/\//.test(env.DATABASE_URL))
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL');
  if (env.NODE_ENV === 'production' && env.COOKIE_SECURE !== 'true')
    throw new Error('COOKIE_SECURE must be true in production (HTTPS)');
  const origins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
  if (origins.some((origin) => !/^https?:\/\/[^/]+$/.test(origin)))
    throw new Error(
      'CORS_ORIGIN must contain comma-separated HTTP(S) origins without trailing slashes',
    );
  return env;
}
