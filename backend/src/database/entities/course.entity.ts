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
import { Prodi } from './prodi.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  prodiId: number;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column()
  sks: number;

  @Column({ nullable: true })
  semesterDefault: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => Prodi)
  @JoinColumn({ name: 'prodiId' })
  prodi: Prodi;
}
