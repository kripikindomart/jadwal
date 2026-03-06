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

@Entity('lecturer_profiles')
export class LecturerProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ nullable: true })
  homeProdiId: number;

  @Column({ nullable: true, unique: true })
  nidn: string;

  @Column({ nullable: true })
  nip: string;

  @Column({ nullable: true })
  frontTitle: string;

  @Column({ nullable: true })
  backTitle: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.lecturerProfile)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Prodi)
  @JoinColumn({ name: 'homeProdiId' })
  homeProdi: Prodi;
}
