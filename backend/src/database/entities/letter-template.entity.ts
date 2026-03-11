import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LetterType } from './letter-type.entity';

@Entity('letter_templates')
export class LetterTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  htmlContent: string;

  @Column({ nullable: true })
  headerImageUrl: string;

  @Column({ type: 'text', nullable: true })
  signatureImageUrl: string;

  @Column({ default: 'manual' })
  signatureType: 'manual' | 'barcode';

  @Column({ type: 'varchar', nullable: true })
  signatureName: string;

  @Column({ type: 'varchar', nullable: true, default: 'Mengetahui,' })
  signatureTitle: string;

  @Column({ type: 'varchar', nullable: true })
  signatureLocation: string;

  @Column({ type: 'text', nullable: true })
  tembusanText: string;

  @OneToMany(() => LetterType, (lt: LetterType) => lt.template)
  letterTypes: LetterType[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
