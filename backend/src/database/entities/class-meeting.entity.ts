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
import { ClassCourse } from './class-course.entity';
import { ClassSchedule } from './class-schedule.entity';

@Entity('class_meetings')
export class ClassMeeting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  classCourseId: number;

  @Column({ nullable: true })
  scheduleIdRef: number;

  @Column()
  meetingNumber: number;

  @Column({ type: 'date', nullable: true })
  date: Date;

  @Column({ default: 'KULIAH' })
  type: string; // KULIAH | UTS | UAS

  @Column({ default: 'OFFLINE' })
  mode: string; // ONLINE | OFFLINE | HYBRID

  @Column({ nullable: true, type: 'text' })
  topic: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ nullable: true })
  materialFile: string;

  @Column({ default: false })
  isLocked: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => ClassCourse, (cc) => cc.classMeetings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'classCourseId' })
  classCourse: ClassCourse;

  @ManyToOne(() => ClassSchedule)
  @JoinColumn({ name: 'scheduleIdRef' })
  schedule: ClassSchedule;
}
