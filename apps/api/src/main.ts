import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Em desenvolvimento, lê as configurações de apps/api/.env.
// Em produção (Docker) não há .env: as variáveis já vêm do ambiente.
try {
  process.loadEnvFile();
} catch {
  // sem arquivo .env, segue com as variáveis do ambiente
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:5173' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Nexo Mangue API em http://localhost:${port}/api`);
}

bootstrap();
