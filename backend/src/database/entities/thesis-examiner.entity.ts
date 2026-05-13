import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ThesisExamSchedule } from './thesis-exam-schedule.entity';
import { User } from './user.entity';

@Entity('thesis_examiners')
export class ThesisExaminer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  examScheduleId: number;

  @Column()
  lecturerId: number;

  @Column({ default: 'PENGUJI' })
  role: string; // KETUA | PENGUJI_1 | PENGUJI_2 | SEKRETARIS

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ThesisExamSchedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'examScheduleId' })
  examSchedule: ThesisExamSchedule;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lecturerId' })
  lecturer: User;
}
