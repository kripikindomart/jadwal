import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Curriculum } from './curriculum.entity';
import { Course } from './course.entity';

@Entity('curriculum_courses')
export class CurriculumCourse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  curriculumId: number;

  @Column()
  courseId: number;

  @Column({ default: 1 })
  semester: number;

  @Column({ default: 'wajib' })
  status: string; // 'wajib' | 'pilihan'

  @Column({ nullable: true })
  minGrade: string; // 'A' | 'B' | 'C' | 'D'

  @Column({ default: false })
  isPackage: boolean;

  @Column({ type: 'jsonb', nullable: true })
  prerequisites: number[]; // array of courseIds

  @Column({ nullable: true })
  concentration: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Curriculum, (c) => c.curriculumCourses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'curriculumId' })
  curriculum: Curriculum;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;
}
