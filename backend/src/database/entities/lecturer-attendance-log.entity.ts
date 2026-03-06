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
import { ClassMeeting } from './class-meeting.entity';
import { User } from './user.entity';

@Entity('lecturer_attendance_logs')
export class LecturerAttendanceLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  classMeetingId: number;

  @Column()
  staffUserId: number;

  @Column({ type: 'timestamptz', nullable: true })
  clockInTime: Date;

  @Column({ type: 'timestamptz', nullable: true })
  clockOutTime: Date;

  @Column({ default: false })
  isManualEntry: boolean;

  @Column({ nullable: true })
  durationMinutes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => ClassMeeting)
  @JoinColumn({ name: 'classMeetingId' })
  classMeeting: ClassMeeting;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'staffUserId' })
  staffUser: User;
}
