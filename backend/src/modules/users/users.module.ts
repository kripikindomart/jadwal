import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  User,
  Role,
  Permission,
  StudentProfile,
  LecturerProfile,
  StaffProdiAccess,
} from '../../database/entities';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      Permission,
      StudentProfile,
      LecturerProfile,
      StaffProdiAccess,
    ]),
  ],
  controllers: [UsersController, RolesController, PermissionsController],
  providers: [UsersService, RolesService, PermissionsService],
  exports: [UsersService, RolesService, PermissionsService],
})
export class UsersModule {}
