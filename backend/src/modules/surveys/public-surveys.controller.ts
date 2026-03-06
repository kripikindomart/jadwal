import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SurveysService } from './surveys.service';
import { PublicSubmitResponseDto } from './dto/survey.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Public Surveys')
@Controller('api/surveys/public')
@Public()
export class PublicSurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Get(':hash')
  @ApiOperation({ summary: 'Mendapatkan detail instrumen survei publik' })
  getInstrument(@Param('hash') hash: string) {
    return this.surveysService.getPublicInstrumentDetails(hash);
  }

  @Get(':hash/results')
  @ApiOperation({ summary: 'Mendapatkan hasil survei publik' })
  getPublicResults(@Param('hash') hash: string, @Query() query: any) {
    return this.surveysService.getPublicResults(hash, query);
  }

  @Get(':hash/respondents')
  @ApiOperation({ summary: 'Mendapatkan daftar responden survei publik' })
  getPublicRespondents(@Param('hash') hash: string, @Query() query: any) {
    return this.surveysService.getPublicRespondents(hash, query);
  }

  @Get(':hash/study-programs')
  @ApiOperation({ summary: 'Mendapatkan daftar program studi' })
  getStudyPrograms(@Param('hash') hash: string) {
    return this.surveysService.getPublicStudyPrograms(hash);
  }

  @Get(':hash/classes/:prodiId')
  @ApiOperation({ summary: 'Mendapatkan daftar kelas' })
  getClasses(
    @Param('hash') hash: string,
    @Param('prodiId', ParseIntPipe) prodiId: number,
  ) {
    return this.surveysService.getPublicClasses(hash, prodiId);
  }

  @Get('class-courses/:classId')
  @ApiOperation({ summary: 'Mendapatkan daftar mata kuliah & dosen' })
  getClassCourses(@Param('classId', ParseIntPipe) classId: number) {
    return this.surveysService.getPublicClassCourses(classId);
  }

  @Get('students/:classCourseId')
  @ApiOperation({ summary: 'Mendapatkan daftar mahasiswa di MK tertentu' })
  getStudents(@Param('classCourseId', ParseIntPipe) classCourseId: number) {
    return this.surveysService.getPublicStudents(classCourseId);
  }

  @Get('class-students/:classId')
  @ApiOperation({
    summary: 'Mendapatkan daftar mahasiswa unik di sebuah Kelas',
  })
  getClassStudents(@Param('classId', ParseIntPipe) classId: number) {
    return this.surveysService.getPublicClassStudents(classId);
  }

  @Get('student-courses/:classId/:studentId')
  @ApiOperation({
    summary:
      'Mendapatkan MK dan Dosen untuk mahasiswa tertentu di sebuah Kelas',
  })
  getStudentClassCourses(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return this.surveysService.getPublicStudentClassCourses(classId, studentId);
  }

  @Post(':hash/submit')
  @ApiOperation({ summary: 'Submit response survei (publik)' })
  submit(@Param('hash') hash: string, @Body() dto: any) {
    return this.surveysService.submitPublicResponse(hash, dto);
  }
}
