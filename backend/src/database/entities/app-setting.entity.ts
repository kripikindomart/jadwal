import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('app_settings')
export class AppSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string;

  @Column({ default: 'text' })
  type: string; // text | boolean | json

  @Column({ default: false })
  isEncrypted: boolean;
}
