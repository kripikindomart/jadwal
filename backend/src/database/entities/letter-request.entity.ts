import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { LetterType } from './letter-type.entity';
import { User } from './user.entity';
import { Prodi } from './prodi.entity';

export enum LetterRequestStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FINISHED = 'FINISHED',
}

@Entity('letter_requests')
export class LetterRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  ticketNumber: string;

  @Column()
  letterTypeId: number;

  @ManyToOne(() => LetterType, (lt) => lt.requests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'letterTypeId' })
  letterType: LetterType;

  // Requester info (public form, no login required)
  @Column()
  requesterName: string;

  @Column({ nullable: true })
  requesterNim: string;

  @Column({ nullable: true })
  requesterEmail: string;

  @Column({ nullable: true })
  requesterPhone: string;

  @Column({ nullable: true })
  studentId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column({ nullable: true })
  prodiId: number;

  @ManyToOne(() => Prodi, { nullable: true })
  @JoinColumn({ name: 'prodiId' })
  prodi: Prodi;

  @Column({
    type: 'varchar',
    default: LetterRequestStatus.PENDING,
  })
  status: LetterRequestStatus;

  /**
   * JSON object storing the submitted answers keyed by field id.
   * Example: { "field_1": "John Doe", "field_2": "2024-01-01", "field_3": "/uploads/file.pdf" }
   */
  @Column({ type: 'simple-json', nullable: true })
  submittedData: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  @Column({ type: 'varchar', nullable: true })
  nomorSurat: string;

  @Column({ type: 'varchar', nullable: true })
  lampiran: string;

  @Column({ type: 'varchar', nullable: true })
  perihal: string;

  @Column({ type: 'varchar', nullable: true })
  tanggalSurat: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  generateTicketNumber() {
    if (!this.ticketNumber) {
      const now = new Date();
      const y = now.getFullYear().toString().slice(-2);
      const m = (now.getMonth() + 1).toString().padStart(2, '0');
      const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
      this.ticketNumber = `REQ-${y}${m}-${rand}`;
    }
  }
}
