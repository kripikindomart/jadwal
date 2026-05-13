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

@Entity('thesis_supervisors')
export class ThesisSupervisor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  thesisId: number;

  @Column()
  lecturerId: number;

  @Column({ default: 'PEMBIMBING_1' })
  role: string; // PEMBIMBING_1 | PEMBIMBING_2

  @Column({ nullable: true })
  skNumber: string;

  @CreateDateColumn()
  assignedAt: Date;

  @ManyToOne(() => ThesisSubmission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'thesisId' })
  thesis: ThesisSubmission;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lecturerId' })
  lecturer: User;
}
