import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { databaseOptions } from './data-source';
// Reduced from the Brocoders TypeOrmConfigService to PostgreSQL only.
@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly config: ConfigService) {}
  createTypeOrmOptions(): TypeOrmModuleOptions {
    return databaseOptions(this.config.getOrThrow<string>('DATABASE_URL'));
  }
}
