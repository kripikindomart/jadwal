import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ClassMeeting } from './class-meeting.entity';
import { User } from './user.entity';

@Entity('student_attendances')
@Unique(['classMeetingId', 'studentId'])
export class StudentAttendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  classMeetingId: number;

  @Column()
  studentId: number;

  @Column({ default: 'H' })
  status: string; // H = Hadir, I = Izin, S = Sakit, A = Alpha

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ClassMeeting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classMeetingId' })
  classMeeting: ClassMeeting;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;
}
