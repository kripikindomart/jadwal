import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ClassCourse } from './class-course.entity';
import { User } from './user.entity';
import { GradeComponent } from './grade-component.entity';

@Entity('student_grades')
@Unique(['classCourseId', 'studentId', 'gradeComponentId'])
export class StudentGrade {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  classCourseId: number;

  @Column()
  studentId: number;

  @Column()
  gradeComponentId: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ClassCourse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classCourseId' })
  classCourse: ClassCourse;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => GradeComponent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gradeComponentId' })
  gradeComponent: GradeComponent;
}
