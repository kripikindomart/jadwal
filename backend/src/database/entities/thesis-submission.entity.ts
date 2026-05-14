import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Prodi } from './prodi.entity';

export enum ThesisStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  TITLE_APPROVED = 'TITLE_APPROVED',
  SUPERVISOR_ASSIGNED = 'SUPERVISOR_ASSIGNED',
  PROPOSAL_GUIDANCE = 'PROPOSAL_GUIDANCE',
  PROPOSAL_EXAM_SCHEDULED = 'PROPOSAL_EXAM_SCHEDULED',
  PROPOSAL_PASSED = 'PROPOSAL_PASSED',
  THESIS_GUIDANCE = 'THESIS_GUIDANCE',
  RESULT_EXAM_SCHEDULED = 'RESULT_EXAM_SCHEDULED',
  RESULT_PASSED = 'RESULT_PASSED',
  REVISION = 'REVISION',
  REVISION_APPROVED = 'REVISION_APPROVED',
  FINAL_EXAM_SCHEDULED = 'FINAL_EXAM_SCHEDULED',
  COMPLETED = 'COMPLETED',
}

@Entity('thesis_submissions')
export class ThesisSubmission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  studentId: number;

  @Column()
  prodiId: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  titleEn: string;

  @Column({ type: 'text', nullable: true })
  abstract: string;

  @Column({ default: 'TESIS' })
  type: string; // TESIS | DISERTASI

  @Column({ type: 'varchar', default: ThesisStatus.DRAFT })
  status: ThesisStatus;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  documentUrl: string;

  @Column({ nullable: true })
  plagiarismUrl: string;

  @Column({ nullable: true })
  keywords: string;

  @Column({ nullable: true })
  concentration: string;

  @Column({ nullable: true })
  requestedSupervisorId1: number;

  @Column({ nullable: true })
  requestedSupervisorId2: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Prodi)
  @JoinColumn({ name: 'prodiId' })
  prodi: Prodi;
}
