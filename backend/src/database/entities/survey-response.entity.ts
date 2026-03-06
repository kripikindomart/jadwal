import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { SurveyInstrument } from './survey-instrument.entity';
import { SurveyAnswer } from './survey-answer.entity';
import { ClassCourse } from './class-course.entity';
import { User } from './user.entity';

@Entity('survey_responses')
@Unique(['instrumentId', 'classCourseId', 'studentId', 'lecturerId'])
export class SurveyResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  instrumentId: number;

  @ManyToOne(() => SurveyInstrument, (i) => i.responses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'instrumentId' })
  instrument: SurveyInstrument;

  @Column()
  classCourseId: number;

  @ManyToOne(() => ClassCourse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classCourseId' })
  classCourse: ClassCourse;

  @Column()
  studentId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column()
  lecturerId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'lecturerId' })
  lecturer: User;

  @OneToMany(() => SurveyAnswer, (a) => a.response, { cascade: true })
  answers: SurveyAnswer[];

  @CreateDateColumn()
  submittedAt: Date;
}
