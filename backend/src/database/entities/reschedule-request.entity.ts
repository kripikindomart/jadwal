import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ClassSchedule } from './class-schedule.entity';
import { User } from './user.entity';
import { Room } from './room.entity';

export enum RescheduleStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('reschedule_requests')
export class RescheduleRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  scheduleId: number;

  @Column()
  requestedBy: number; // lecturer userId

  @Column({ type: 'date' })
  newDate: string;

  @Column({ type: 'time' })
  newStartTime: string;

  @Column({ type: 'time' })
  newEndTime: string;

  @Column({ nullable: true })
  newRoomId: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'varchar', default: RescheduleStatus.PENDING })
  status: RescheduleStatus;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  @Column({ nullable: true })
  approvedBy: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ClassSchedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scheduleId' })
  schedule: ClassSchedule;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requestedBy' })
  requester: User;

  @ManyToOne(() => Room, { nullable: true })
  @JoinColumn({ name: 'newRoomId' })
  newRoom: Room;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedBy' })
  approver: User;
}
