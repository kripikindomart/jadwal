import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import {
  LecturerAttendanceLog,
  ClassMeeting,
  ClassSchedule,
  ClassCourse,
  Class,
  Semester,
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LecturerAttendanceLog,
      ClassMeeting,
      ClassSchedule,
      ClassCourse,
      Class,
      Semester,
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
