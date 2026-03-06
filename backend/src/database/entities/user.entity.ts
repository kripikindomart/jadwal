import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToMany,
  JoinTable,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Role } from './role.entity';
import { StudentProfile } from './student-profile.entity';
import { LecturerProfile } from './lecturer-profile.entity';
import { StaffProdiAccess } from './staff-prodi-access.entity';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ nullable: true })
  @Exclude()
  refreshToken: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles: Role[];

  @OneToOne(() => StudentProfile, (profile) => profile.user)
  studentProfile: StudentProfile;

  @OneToOne(() => LecturerProfile, (profile) => profile.user)
  lecturerProfile: LecturerProfile;

  @OneToMany(() => StaffProdiAccess, (access) => access.user)
  staffProdiAccess: StaffProdiAccess[];
}
