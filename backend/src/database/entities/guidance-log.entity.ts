import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ThesisSubmission } from './thesis-submission.entity';
import { User } from './user.entity';

@Entity('guidance_logs')
export class GuidanceLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  thesisId: number;

  @Column()
  lecturerId: number;

  @Column()
  studentId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time', nullable: true })
  startTime: string;

  @Column({ type: 'time', nullable: true })
  endTime: string;

  @Column({ type: 'text' })
  topic: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  studentProgress: string;

  @Column({ type: 'text', nullable: true })
  nextAction: string;

  @Column({ nullable: true })
  chapter: string; // BAB 1, BAB 2, etc.

  @Column({ nullable: true })
  attachmentUrl: string;

  @Column({ default: 'DONE' })
  status: string; // DONE | CANCELLED | NO_SHOW

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ThesisSubmission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'thesisId' })
  thesis: ThesisSubmission;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'lecturerId' })
  lecturer: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'studentId' })
  student: User;
}
