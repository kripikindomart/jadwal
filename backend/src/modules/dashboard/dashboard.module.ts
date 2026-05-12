import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import {
  User,
  Semester,
  Class,
  ClassCourse,
  ClassSchedule,
  ClassMeeting,
  LecturerAttendanceLog,
  StudentProfile,
  LecturerProfile,
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Semester,
      Class,
      ClassCourse,
      ClassSchedule,
      ClassMeeting,
      LecturerAttendanceLog,
      StudentProfile,
      LecturerProfile,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
