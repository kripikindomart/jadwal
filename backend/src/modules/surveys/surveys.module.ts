import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveyInstrument } from '../../database/entities/survey-instrument.entity';
import { SurveyQuestion } from '../../database/entities/survey-question.entity';
import { SurveyResponse } from '../../database/entities/survey-response.entity';
import { SurveyAnswer } from '../../database/entities/survey-answer.entity';
import { Class } from '../../database/entities/class.entity';
import { ClassStudent } from '../../database/entities/class-student.entity';
import { SurveysService } from './surveys.service';
import { SurveysController } from './surveys.controller';
import { PublicSurveysController } from './public-surveys.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SurveyInstrument,
      SurveyQuestion,
      SurveyResponse,
      SurveyAnswer,
      Class,
      ClassStudent,
    ]),
  ],
  controllers: [SurveysController, PublicSurveysController],
  providers: [SurveysService],
  exports: [SurveysService],
})
export class SurveysModule {}
