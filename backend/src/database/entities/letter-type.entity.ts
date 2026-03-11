import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LetterRequest } from './letter-request.entity';
import { LetterTemplate } from './letter-template.entity';
import { LetterClassification } from './letter-classification.entity';

@Entity('letter_types')
export class LetterType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  allowPreview: boolean;

  /**
   * JSON array defining the dynamic form fields.
   * Each field object has: { id, label, type, required, options?, placeholder? }
   * Types: 'text', 'textarea', 'number', 'date', 'select', 'file', 'email', 'phone'
   */
  @Column({ type: 'simple-json', nullable: true })
  fields: any[];

  @Column({ nullable: true })
  templateId: number;

  @Column({ type: 'simple-json', nullable: true })
  variableMapping: Record<string, string>;

  @ManyToOne(() => LetterTemplate, (lt) => lt.letterTypes, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'templateId' })
  template: LetterTemplate;

  // Classification for auto-numbering
  @Column({ nullable: true })
  classificationId: number;

  @ManyToOne(() => LetterClassification, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: true,
  })
  @JoinColumn({ name: 'classificationId' })
  classification: LetterClassification;

  @Column({
    type: 'varchar',
    nullable: true,
    default: '{urut}/{klasifikasi}/SPs-UIKA/{prodi}/{tahun}',
  })
  numberFormat: string;

  @Column({ default: true })
  includeProdiCode: boolean;

  @OneToMany(() => LetterRequest, (r: LetterRequest) => r.letterType)
  requests: LetterRequest[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
