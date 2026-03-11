import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LetterType } from '../../database/entities/letter-type.entity';
import { LetterRequest } from '../../database/entities/letter-request.entity';
import { LetterTemplate } from '../../database/entities/letter-template.entity';
import { Prodi } from '../../database/entities/prodi.entity';
import { StudentProfile } from '../../database/entities/student-profile.entity';
import { User } from '../../database/entities/user.entity';
import { LecturerProfile } from '../../database/entities/lecturer-profile.entity';
import { Concentration } from '../../database/entities/concentration.entity';
import { LettersService } from './letters.service';
import { LettersController } from './letters.controller';
import { PublicLettersController } from './public-letters.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LetterType,
      LetterTemplate,
      LetterRequest,
      Prodi,
      StudentProfile,
      User,
      LecturerProfile,
      Concentration,
    ]),
  ],
  controllers: [LettersController, PublicLettersController],
  providers: [LettersService],
  exports: [LettersService],
})
export class LettersModule {}
