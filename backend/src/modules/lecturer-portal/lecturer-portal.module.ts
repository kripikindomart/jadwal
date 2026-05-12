import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LecturerPortalController } from './lecturer-portal.controller';
import { LecturerPortalService } from './lecturer-portal.service';
import { PublicAssignmentController } from './public-assignment.controller';
import {
  LecturerProfile,
  ClassCourse,
  ClassLecturer,
  ClassSchedule,
  ClassMeeting,
  ClassCourseStudent,
  GradeComponent,
  Semester,
  Assignment,
  Submission,
  StudentAttendance,
  StudentGrade,
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LecturerProfile,
      ClassCourse,
      ClassLecturer,
      ClassSchedule,
      ClassMeeting,
      ClassCourseStudent,
      GradeComponent,
      Semester,
      Assignment,
      Submission,
      StudentAttendance,
      StudentGrade,
    ]),
  ],
  controllers: [LecturerPortalController, PublicAssignmentController],
  providers: [LecturerPortalService],
})
export class LecturerPortalModule {}
