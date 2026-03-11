import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { seedDatabase } from './database/seeds/seed';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Serve static files for uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

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

  // Guaranteed CORS Middleware
  app.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
    res.header(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    );
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type,Accept,Authorization,X-Requested-With',
    );
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
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
