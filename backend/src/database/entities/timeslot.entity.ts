import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('timeslots')
export class Timeslot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', comment: '0=Sunday, 1=Monday, ..., 6=Saturday' })
  dayOfWeek: number;

  @Column({
    type: 'time',
    comment: 'Start time of the timeslot (e.g., 07:00:00)',
  })
  startTime: string;

  @Column({
    type: 'time',
    comment: 'End time of the timeslot (e.g., 08:40:00)',
  })
  endTime: string;

  @Column({ default: true })
  isUsable: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
