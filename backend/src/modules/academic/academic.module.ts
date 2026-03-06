import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Semester } from '../../database/entities/semester.entity';
import { Prodi } from '../../database/entities/prodi.entity';
import { Course } from '../../database/entities/course.entity';
import { Room } from '../../database/entities/room.entity';
import { Timeslot } from '../../database/entities/timeslot.entity';
import { GradeComponent } from '../../database/entities/grade-component.entity';

import { SemestersController } from './semesters.controller';
import { SemestersService } from './semesters.service';
import { ProdisController } from './prodis.controller';
import { ProdisService } from './prodis.service';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { TimeslotsController } from './timeslots.controller';
import { TimeslotsService } from './timeslots.service';
import { GradeComponentsController } from './grade-components.controller';
import { GradeComponentsService } from './grade-components.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Semester,
      Prodi,
      Course,
      Room,
      Timeslot,
      GradeComponent,
    ]),
  ],
  controllers: [
    SemestersController,
    ProdisController,
    CoursesController,
    RoomsController,
    TimeslotsController,
    GradeComponentsController,
  ],
  providers: [
    SemestersService,
    ProdisService,
    CoursesService,
    RoomsService,
    TimeslotsService,
    GradeComponentsService,
  ],
  exports: [
    SemestersService,
    ProdisService,
    CoursesService,
    RoomsService,
    TimeslotsService,
    GradeComponentsService,
  ],
})
export class AcademicModule {}
