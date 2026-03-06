import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig, jwtConfig } from './config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AcademicModule } from './modules/academic/academic.module';
import { LecturersModule } from './modules/lecturers/lecturers.module';
import { StudentsModule } from './modules/students/students.module';
import { ClassesModule } from './modules/classes/classes.module';
import { SurveysModule } from './modules/surveys/surveys.module';

@Module({
  imports: [
    // Global config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
      inject: [ConfigService],
    }),

    // All entities registered globally
    DatabaseModule,

    // Feature modules
    AuthModule,
    UsersModule,
    AcademicModule,
    LecturersModule,
    StudentsModule,
    ClassesModule,
    SurveysModule,
  ],
})
export class AppModule {}
