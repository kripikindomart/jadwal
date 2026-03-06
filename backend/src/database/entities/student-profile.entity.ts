import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Prodi } from './prodi.entity';

@Entity('student_profiles')
export class StudentProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  prodiId: number;

  @Column({ unique: true })
  nim: string;

  @Column({ nullable: true })
  angkatan: string;

  @Column({ default: 'aktif' })
  status: string; // aktif, cuti, lulus, do

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.studentProfile)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Prodi)
  @JoinColumn({ name: 'prodiId' })
  prodi: Prodi;
}
