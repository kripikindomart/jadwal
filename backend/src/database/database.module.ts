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
} from './entities';

const entities = [
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
];

@Global()
@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
