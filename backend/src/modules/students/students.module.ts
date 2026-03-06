import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { StudentProfile } from '../../database/entities/student-profile.entity';
import { Role } from '../../database/entities/role.entity';
import { Prodi } from '../../database/entities/prodi.entity';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, StudentProfile, Role, Prodi])],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
