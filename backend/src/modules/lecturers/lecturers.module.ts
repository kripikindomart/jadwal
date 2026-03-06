import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { LecturerProfile } from '../../database/entities/lecturer-profile.entity';
import { Role } from '../../database/entities/role.entity';
import { Prodi } from '../../database/entities/prodi.entity';
import { LecturersController } from './lecturers.controller';
import { LecturersService } from './lecturers.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, LecturerProfile, Role, Prodi])],
  controllers: [LecturersController],
  providers: [LecturersService],
  exports: [LecturersService],
})
export class LecturersModule {}
