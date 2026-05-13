import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuidanceController } from './guidance.controller';
import { GuidanceService } from './guidance.service';
import { GuidanceSchedule, LecturerProfile, StudentProfile, ThesisSubmission } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([GuidanceSchedule, LecturerProfile, StudentProfile, ThesisSubmission])],
  controllers: [GuidanceController],
  providers: [GuidanceService],
  exports: [GuidanceService],
})
export class GuidanceModule {}
