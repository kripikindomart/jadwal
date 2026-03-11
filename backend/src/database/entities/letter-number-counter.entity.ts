import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { LetterClassification } from './letter-classification.entity';

@Entity('letter_number_counters')
@Unique(['classificationId', 'year'])
export class LetterNumberCounter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  classificationId: number;

  @ManyToOne(() => LetterClassification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classificationId' })
  classification: LetterClassification;

  @Column()
  year: number;

  @Column({ default: 0 })
  lastNumber: number;
}
