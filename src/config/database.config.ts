import { registerAs } from '@nestjs/config';
import { Environment } from './environment.enum';

export const DatabaseConfig = registerAs('database', () => ({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
  synchronize: process.env.NODE_ENV === Environment.DEVELOPMENT,
  autoLoadEntities: process.env.NODE_ENV === Environment.DEVELOPMENT,
  ssl: process.env.NODE_ENV === Environment.PRODUCTION,
  logging: process.env.NODE_ENV === Environment.DEVELOPMENT,
}));