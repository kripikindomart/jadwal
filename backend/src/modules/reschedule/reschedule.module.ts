import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RescheduleController } from './reschedule.controller';
import { RescheduleService } from './reschedule.service';
import { RescheduleRequest, ClassSchedule } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([RescheduleRequest, ClassSchedule])],
  controllers: [RescheduleController],
  providers: [RescheduleService],
})
export class RescheduleModule {}
