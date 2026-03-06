import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { SchedulesController } from './schedules.controller';
import { ScheduleGeneratorService } from './schedule-generator.service';
import {
  Class,
  ClassLecturer,
  ClassStudent,
  ClassSchedule,
  ClassMeeting,
  Room,
  Timeslot,
  ClassCourse,
  ClassCourseStudent,
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Class,
      ClassLecturer,
      ClassStudent,
      ClassSchedule,
      ClassMeeting,
      Room,
      Timeslot,
      ClassCourse,
      ClassCourseStudent,
    ]),
  ],
  controllers: [ClassesController, SchedulesController],
  providers: [ClassesService, ScheduleGeneratorService],
  exports: [ClassesService],
})
export class ClassesModule {}
