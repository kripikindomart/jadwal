import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ThesisSubmission } from './thesis-submission.entity';
import { Room } from './room.entity';

export enum ExamStatus {
  SCHEDULED = 'SCHEDULED',
  ONGOING = 'ONGOING',
  PASSED = 'PASSED',
  REVISION = 'REVISION',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('thesis_exam_schedules')
export class ThesisExamSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  thesisId: number;

  @Column()
  type: string; // SEMINAR_PROPOSAL | SEMINAR_HASIL | SIDANG_AKHIR

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ nullable: true })
  roomId: number;

  @Column({ type: 'varchar', default: ExamStatus.SCHEDULED })
  status: ExamStatus;

  @Column({ type: 'text', nullable: true })
  result: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number;

  @Column({ type: 'date', nullable: true })
  revisionDeadline: string;

  @Column({ type: 'text', nullable: true })
  revisionNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ThesisSubmission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'thesisId' })
  thesis: ThesisSubmission;

  @ManyToOne(() => Room, { nullable: true })
  @JoinColumn({ name: 'roomId' })
  room: Room;
}
