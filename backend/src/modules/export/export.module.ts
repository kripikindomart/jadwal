import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import {
  ClassSchedule,
  ClassCourse,
  ClassCourseStudent,
  ClassMeeting,
  StudentAttendance,
  StudentGrade,
  GradeComponent,
  Semester,
  LecturerAttendanceLog,
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClassSchedule,
      ClassCourse,
      ClassCourseStudent,
      ClassMeeting,
      StudentAttendance,
      StudentGrade,
      GradeComponent,
      Semester,
      LecturerAttendanceLog,
    ]),
  ],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
