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

import { Concentration } from './concentration.entity';

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
  nirm: string;

  @Column({ nullable: true })
  gender: string; // L, P

  @Column({ nullable: true })
  tempatLahir: string;

  @Column({ type: 'date', nullable: true })
  tanggalLahir: Date;

  @Column({ nullable: true })
  angkatan: string;

  @Column({ nullable: true })
  concentrationId: number;

  @ManyToOne(() => Concentration, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'concentrationId' })
  concentration: Concentration;

  // Tesis / Disertasi
  @Column({ type: 'text', nullable: true })
  judulTesis: string;

  @Column({ nullable: true })
  pembimbing1: string;

  @Column({ nullable: true })
  pembimbing2: string;

  @Column({ nullable: true })
  penguji1: string;

  @Column({ nullable: true })
  penguji2: string;

  // Nilai
  @Column({ type: 'float', nullable: true })
  nilaiPembimbing1: number;

  @Column({ type: 'float', nullable: true })
  nilaiPembimbing2: number;

  @Column({ type: 'float', nullable: true })
  nilaiPenguji1: number;

  @Column({ type: 'float', nullable: true })
  nilaiPenguji2: number;

  @Column({ type: 'float', nullable: true })
  nilaiKomprehensif: number;

  // Pekerjaan & Alamat
  @Column({ nullable: true })
  pekerjaan: string;

  @Column({ type: 'text', nullable: true })
  alamatRumah: string;

  @Column({ type: 'text', nullable: true })
  alamatKantor: string;

  // Identitas
  @Column({ nullable: true })
  nik: string;

  @Column({ nullable: true })
  noTelp: string;

  // IPK & Kelulusan
  @Column({ type: 'float', nullable: true })
  ipk: number;

  @Column({ type: 'date', nullable: true })
  tanggalLulus: Date;

  @Column({ type: 'date', nullable: true })
  tanggalSidang: Date;

  @Column({ nullable: true })
  masaStudi: string;

  // Orang Tua
  @Column({ nullable: true })
  namaAyah: string;

  @Column({ nullable: true })
  namaIbu: string;

  // Photo
  @Column({ nullable: true })
  photoUrl: string;

  @Column({ type: 'text', nullable: true })
  keterangan: string;

  @Column({ default: false })
  profileEditedByUser: boolean;

  @Column({ nullable: true, length: 4 })
  pin: string;

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
