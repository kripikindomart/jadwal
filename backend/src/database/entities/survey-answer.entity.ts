import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SurveyResponse } from './survey-response.entity';
import { SurveyQuestion } from './survey-question.entity';

@Entity('survey_answers')
export class SurveyAnswer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  responseId: number;

  @ManyToOne(() => SurveyResponse, (r) => r.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'responseId' })
  response: SurveyResponse;

  @Column()
  questionId: number;

  @ManyToOne(() => SurveyQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question: SurveyQuestion;

  @Column({ type: 'text' })
  value: string;
}
