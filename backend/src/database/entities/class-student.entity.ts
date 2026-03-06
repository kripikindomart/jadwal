import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Class } from './class.entity';
import { User } from './user.entity';
import { Semester } from './semester.entity';

@Entity('class_students')
export class ClassStudent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  classId: number;

  @Column()
  studentId: number;

  @Column()
  semesterId: number;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => Class)
  @JoinColumn({ name: 'classId' })
  class: Class;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Semester)
  @JoinColumn({ name: 'semesterId' })
  semester: Semester;
}
