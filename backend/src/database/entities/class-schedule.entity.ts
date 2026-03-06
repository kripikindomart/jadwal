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
import { Room } from './room.entity';

@Entity('class_schedules')
export class ClassSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  classCourseId: number;

  @Column({ nullable: true })
  roomId: number;

  @Column()
  dayOfWeek: number; // 0=Sunday, 1=Monday ... 6=Saturday

  @Column({ type: 'date', nullable: true })
  date: string;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => ClassCourse, (cc) => cc.classSchedules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'classCourseId' })
  classCourse: ClassCourse;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'roomId' })
  room: Room;
}
