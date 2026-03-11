import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Prodi } from './prodi.entity';
import { CurriculumCourse } from './curriculum-course.entity';

@Entity('curriculums')
export class Curriculum {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  prodiId: number;

  @Column()
  name: string;

  @Column()
  year: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => Prodi)
  @JoinColumn({ name: 'prodiId' })
  prodi: Prodi;

  @OneToMany(() => CurriculumCourse, (cc) => cc.curriculum)
  curriculumCourses: CurriculumCourse[];
}
