import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThesisController } from './thesis.controller';
import { ThesisService } from './thesis.service';
import {
  ThesisSubmission,
  ThesisSupervisor,
  ThesisExamSchedule,
  ThesisExaminer,
  GuidanceLog,
  LecturerProfile,
  StudentProfile,
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ThesisSubmission,
      ThesisSupervisor,
      ThesisExamSchedule,
      ThesisExaminer,
      GuidanceLog,
      LecturerProfile,
      StudentProfile,
    ]),
  ],
  controllers: [ThesisController],
  providers: [ThesisService],
})
export class ThesisModule {}
