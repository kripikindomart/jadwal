import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ClassCourse } from './class-course.entity';
import { User } from './user.entity';

@Entity('class_course_students')
export class ClassCourseStudent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  classCourseId: number;

  @Column()
  studentId: number;

  @ManyToOne(() => ClassCourse, (cc) => cc.classCourseStudents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'classCourseId' })
  classCourse: ClassCourse;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;
}
