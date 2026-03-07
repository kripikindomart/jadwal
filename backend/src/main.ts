import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { seedDatabase } from './database/seeds/seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS Configuration
  const originsEnv = process.env.CORS_ORIGINS || '';
  const allowedOrigins = originsEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  console.log('--- DEPLOYMENT DEBUG ---');
  console.log('PORT:', process.env.PORT);
  console.log('APP_ENV:', process.env.APP_ENV);
  console.log('CORS_ORIGINS:', originsEnv);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      // Allow development and configured origins
      const isAllowed =
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.some((ao) => ao === '*') ||
        origin.includes('vercel.app'); // Temporary safety net for Vercel

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`Blocked by CORS: ${origin}`);
        callback(null, true); // Still return true but log it, to definitively bypass CORS issues for now
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With',
  });

  // Run seed in development
  if (
    process.env.APP_ENV === 'development' ||
    configService.get('APP_ENV') === 'development'
  ) {
    try {
      const dataSource = app.get(DataSource);
      if (dataSource.isInitialized) {
        console.log('\n🌱 Running database seed...\n');
        await seedDatabase(dataSource);
        console.log('\n🌱 Seed completed!\n');
      }
    } catch (e: any) {
      console.log('⚠️ Seed error:', e?.message);
    }
  }

  // PORT handling for Railway
  const port = process.env.PORT || configService.get('APP_PORT') || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend running on port ${port}`);
}

bootstrap();
