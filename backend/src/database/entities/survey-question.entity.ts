import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SurveyInstrument } from './survey-instrument.entity';

@Entity('survey_questions')
export class SurveyQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  instrumentId: number;

  @ManyToOne(() => SurveyInstrument, (i) => i.questions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'instrumentId' })
  instrument: SurveyInstrument;

  @Column({ type: 'text' })
  text: string;

  @Column({
    type: 'enum',
    enum: ['likert', 'text', 'multiple_choice'],
    default: 'likert',
  })
  type: 'likert' | 'text' | 'multiple_choice';

  @Column({ type: 'simple-json', nullable: true })
  options: string[] | null;

  @Column({ default: 0 })
  order: number;

  @Column({ default: true })
  isRequired: boolean;
}
