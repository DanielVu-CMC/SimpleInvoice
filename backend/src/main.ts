import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupApplication } from './setup';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApplication(app);
  app.enableShutdownHooks();
  await app.listen(
    app.get(ConfigService).getOrThrow<number>('APP_PORT'),
    '0.0.0.0',
  );
}
void bootstrap();
