import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurriculumsService } from './curriculums.service';
import { CurriculumsController } from './curriculums.controller';
import { Curriculum } from '../../database/entities/curriculum.entity';
import { CurriculumCourse } from '../../database/entities/curriculum-course.entity';
import { Course } from '../../database/entities/course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Curriculum, CurriculumCourse, Course])],
  controllers: [CurriculumsController],
  providers: [CurriculumsService],
  exports: [CurriculumsService],
})
export class CurriculumsModule {}
