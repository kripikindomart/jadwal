import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConcentrationsService } from './concentrations.service';
import { ConcentrationsController } from './concentrations.controller';
import { Concentration } from '../../database/entities/concentration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Concentration])],
  controllers: [ConcentrationsController],
  providers: [ConcentrationsService],
  exports: [ConcentrationsService],
})
export class ConcentrationsModule {}
