import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'pasca_jadwal',
  autoLoadEntities: true,
  synchronize: process.env.APP_ENV === 'development',
  logging: process.env.APP_ENV === 'development',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
}));
