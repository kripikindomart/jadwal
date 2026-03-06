import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('grade_components')
export class GradeComponent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string; // e.g., 'Tugas 1', 'UTS', 'UAS', 'Presensi'

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  weight: number; // e.g., 20.00 for 20%

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
