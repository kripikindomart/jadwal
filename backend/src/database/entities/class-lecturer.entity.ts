import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ClassCourse } from './class-course.entity';
import { User } from './user.entity';

@Entity('class_lecturers')
export class ClassLecturer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  classCourseId: number;

  @Column()
  lecturerId: number;

  @Column({ default: false })
  isPrimary: boolean;

  @Column({ nullable: true, comment: 'Pertemuan mulai (misal 1)' })
  meetingStart: number;

  @Column({ nullable: true, comment: 'Pertemuan selesai (misal 8)' })
  meetingEnd: number;

  @ManyToOne(() => ClassCourse, (cc) => cc.classLecturers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'classCourseId' })
  classCourse: ClassCourse;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lecturerId' })
  lecturer: User;
}
