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

  // CORS for Vue frontend
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  });

  // Run seed in development
  if (configService.get('APP_ENV') === 'development') {
    try {
      const dataSource = app.get(DataSource);
      console.log('DataSource initialized:', dataSource.isInitialized);
      if (dataSource.isInitialized) {
        console.log('\n🌱 Running database seed...\n');
        await seedDatabase(dataSource);
        console.log('\n🌱 Seed completed!\n');
      }
    } catch (e: any) {
      console.log('⚠️  Seed error:', e?.message, e?.stack);
    }
  }

  const port = configService.get('APP_PORT') || 3000;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);
}

bootstrap();
