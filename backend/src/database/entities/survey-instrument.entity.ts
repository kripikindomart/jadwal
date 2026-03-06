import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { Semester } from './semester.entity';
import { SurveyQuestion } from './survey-question.entity';
import { SurveyResponse } from './survey-response.entity';

@Entity('survey_instruments')
export class SurveyInstrument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  semesterId: number;

  @ManyToOne(() => Semester, { nullable: true })
  @JoinColumn({ name: 'semesterId' })
  semester: Semester;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => SurveyQuestion, (q) => q.instrument, { cascade: true })
  questions: SurveyQuestion[];

  @OneToMany(() => SurveyResponse, (r) => r.instrument)
  responses: SurveyResponse[];

  @Column({ nullable: true })
  redirectUrl: string;

  @Column({ unique: true, nullable: true })
  publicUrlHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  generateHash() {
    if (!this.publicUrlHash) {
      this.publicUrlHash = Math.random().toString(36).substring(2, 8);
    }
  }
}
