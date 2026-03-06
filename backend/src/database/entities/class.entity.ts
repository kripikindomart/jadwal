import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ClassCourse } from './class-course.entity';
import { Semester } from './semester.entity';
import { ClassStudent } from './class-student.entity';
import { Prodi } from './prodi.entity';

@Entity('classes')
export class Class {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  semesterId: number;

  @Column({ nullable: true })
  prodiId: number;

  @Column()
  name: string; // e.g. "Kelas A"

  @Column({ nullable: true })
  quota: number;

  @Column({ nullable: true, unique: true })
  token: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => Semester, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'semesterId' })
  semester: Semester;

  @ManyToOne(() => Prodi, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'prodiId' })
  prodi: Prodi;

  @OneToMany(() => ClassStudent, (classStudent) => classStudent.class)
  classStudents: ClassStudent[];

  @OneToMany(() => ClassCourse, (classCourse) => classCourse.class)
  classCourses: ClassCourse[];
}
