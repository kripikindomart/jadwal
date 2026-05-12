import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AppSetting, ClassMeeting } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([AppSetting, ClassMeeting])],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
