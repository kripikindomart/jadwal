import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('audit_logs')
@Index(['entityName', 'entityId'])
@Index(['userId'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  userId: number;

  @Column()
  action: string; // CREATE | UPDATE | DELETE | LOGIN | APPROVE | etc.

  @Column()
  entityName: string; // e.g. 'LetterRequest', 'ClassMeeting', 'StudentGrade'

  @Column({ nullable: true })
  entityId: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-json', nullable: true })
  oldValue: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  newValue: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
