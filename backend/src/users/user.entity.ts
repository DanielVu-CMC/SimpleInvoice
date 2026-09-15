import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true, length: 254 }) email: string;
  @Column({ select: false, length: 60 }) passwordHash: string;
  @Column({ length: 200 }) fullname: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
