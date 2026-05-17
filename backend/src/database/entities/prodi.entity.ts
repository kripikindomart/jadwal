import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export enum ThesisFlowMode {
  A = 'A', // Proposal -> Pembimbing -> Seminar Hasil -> Sidang Akhir
  B = 'B', // Proposal -> Pembimbing -> Seminar Proposal -> Sidang Akhir
  C = 'C', // Proposal -> Pembimbing -> Seminar Proposal -> Seminar Hasil -> Sidang Akhir
}

@Entity('prodis')
export class Prodi {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column()
  degree: string; // 'S2' | 'S3'

  @Column({ type: 'varchar', length: 1, default: ThesisFlowMode.C })
  thesisFlowMode: ThesisFlowMode;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
