import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Room } from './room.entity';

export enum GuidanceStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

@Entity('guidance_schedules')
export class GuidanceSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  studentId: number;

  @Column()
  lecturerId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ nullable: true })
  roomId: number;

  @Column({ type: 'varchar', default: GuidanceStatus.PENDING })
  status: GuidanceStatus;

  @Column({ type: 'text', nullable: true })
  topic: string;

  @Column({ type: 'text', nullable: true })
  studentNotes: string;

  @Column({ type: 'text', nullable: true })
  lecturerNotes: string;

  @Column({ type: 'varchar', nullable: true })
  type: string; // TESIS | DISERTASI | PROPOSAL | UMUM

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lecturerId' })
  lecturer: User;

  @ManyToOne(() => Room, { nullable: true })
  @JoinColumn({ name: 'roomId' })
  room: Room;
}
