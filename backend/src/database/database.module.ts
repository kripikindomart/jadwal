import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  User,
  Role,
  Permission,
  StudentProfile,
  LecturerProfile,
  StaffProdiAccess,
  Semester,
  Prodi,
  Course,
  Room,
  Class,
  ClassLecturer,
  ClassSchedule,
  ClassMeeting,
  ClassStudent,
  LecturerAttendanceLog,
  AppSetting,
  Assignment,
  Submission,
  StudentAttendance,
  StudentGrade,
  Notification,
  AuditLog,
  GuidanceSchedule,
  ThesisSubmission,
  ThesisSupervisor,
  ThesisExamSchedule,
  ThesisExaminer,
  GuidanceLog,
  RescheduleRequest,
} from './entities';

const entities = [
  User, Role, Permission, StudentProfile, LecturerProfile, StaffProdiAccess,
  Semester, Prodi, Course, Room, Class, ClassLecturer, ClassSchedule,
  ClassMeeting, ClassStudent, LecturerAttendanceLog, AppSetting,
  Assignment, Submission, StudentAttendance, StudentGrade,
  Notification, AuditLog, GuidanceSchedule,
  ThesisSubmission, ThesisSupervisor, ThesisExamSchedule, ThesisExaminer, GuidanceLog,
  RescheduleRequest,
];

@Global()
@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
