import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { ClassSchedule, ClassLecturer, Semester } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([ClassSchedule, ClassLecturer, Semester])],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
