import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Prodi } from './prodi.entity';

@Entity('staff_prodi_access')
export class StaffProdiAccess {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  prodiId: number;

  @ManyToOne(() => User, (user) => user.staffProdiAccess)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Prodi)
  @JoinColumn({ name: 'prodiId' })
  prodi: Prodi;
}
