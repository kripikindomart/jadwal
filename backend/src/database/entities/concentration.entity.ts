import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Prodi } from './prodi.entity';

@Entity('concentrations')
export class Concentration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  prodiId: number;

  @Column({ nullable: true })
  code: string;

  @Column()
  name: string;

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
}
