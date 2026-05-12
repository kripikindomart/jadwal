import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisplayController } from './display.controller';
import { DisplayService } from './display.service';
import { ClassSchedule, Semester } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([ClassSchedule, Semester])],
  controllers: [DisplayController],
  providers: [DisplayService],
})
export class DisplayModule {}
