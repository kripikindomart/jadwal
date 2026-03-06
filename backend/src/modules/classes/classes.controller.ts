import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ClassesService } from './classes.service';
import {
  CreateClassDto,
  UpdateClassDto,
  AssignLecturersDto,
  EnrollStudentsDto,
} from './dto/classes.dto';
import {
  CreateClassCourseDto,
  UpdateClassCourseDto,
} from './dto/class-course.dto';

@ApiTags('Classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @RequirePermissions('classes.view')
  @ApiOperation({ summary: 'Mendapatkan daftar kelas' })
  findAll(
    @Query('page') page?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) perPage?: number,
    @Query('search') search?: string,
    @Query('courseId') courseId?: string,
    @Query('semesterId') semesterId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = perPage || 10;
    const pCourseId = courseId ? parseInt(courseId, 10) : undefined;
    const pSemesterId = semesterId ? parseInt(semesterId, 10) : undefined;

    return this.classesService.findAll(
      pageNum,
      limitNum,
      search,
      pCourseId,
      pSemesterId,
    );
  }

  @Get(':id')
  @RequirePermissions('classes.view')
  @ApiOperation({ summary: 'Mendapatkan detail kelas' })
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(+id);
  }

  @Post()
  @RequirePermissions('classes.create')
  @ApiOperation({ summary: 'Membuat kelas baru' })
  create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Patch(':id')
  @RequirePermissions('classes.update')
  @ApiOperation({ summary: 'Memperbarui data kelas' })
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto) {
    return this.classesService.update(+id, updateClassDto);
  }

  @Delete(':id')
  @RequirePermissions('classes.delete')
  @ApiOperation({ summary: 'Menghapus kelas soft delete' })
  remove(@Param('id') id: string) {
    return this.classesService.remove(+id);
  }

  @Patch(':id/restore')
  @RequirePermissions('classes.delete')
  @ApiOperation({ summary: 'Memulihkan kelas' })
  restore(@Param('id') id: string) {
    return this.classesService.restore(+id);
  }

  @Delete(':id/force')
  @RequirePermissions('classes.delete')
  @ApiOperation({ summary: 'Menghapus kelas permanen' })
  forceDelete(@Param('id') id: string) {
    return this.classesService.forceDelete(+id);
  }

  @Post('bulk')
  @RequirePermissions('classes.delete')
  @ApiOperation({ summary: 'Aksi massal (trash, restore, forceDelete)' })
  bulkAction(
    @Body()
    body: {
      ids: number[];
      action: 'trash' | 'restore' | 'forceDelete';
    },
  ) {
    return this.classesService.bulkAction(body.action, body.ids);
  }

  @Post(':id/courses')
  @RequirePermissions('classes.update')
  @ApiOperation({ summary: 'Menambahkan matakuliah ke dalam rombel (kelas)' })
  addClassCourse(@Param('id') id: string, @Body() dto: CreateClassCourseDto) {
    return this.classesService.addClassCourse(+id, dto);
  }

  @Patch('courses/:courseId')
  @RequirePermissions('classes.update')
  @ApiOperation({ summary: 'Mengedit pengaturan matakuliah dalam rombel' })
  updateClassCourse(
    @Param('courseId') courseId: string,
    @Body() dto: UpdateClassCourseDto,
  ) {
    return this.classesService.updateClassCourse(+courseId, dto);
  }

  @Delete('courses/:courseId')
  @RequirePermissions('classes.update')
  @ApiOperation({ summary: 'Menghapus matakuliah dari rombel' })
  removeClassCourse(@Param('courseId') courseId: string) {
    return this.classesService.removeClassCourse(+courseId);
  }

  @Post('courses/:courseId/lecturers')
  @RequirePermissions('classes.update')
  @ApiOperation({ summary: 'Menugaskan dosen ke matakuliah di dalam rombel' })
  assignLecturers(
    @Param('courseId') courseId: string,
    @Body() dto: AssignLecturersDto,
  ) {
    return this.classesService.assignLecturers(+courseId, dto);
  }

  @Post(':id/students')
  @RequirePermissions('classes.update')
  @ApiOperation({ summary: 'Memasukkan mahasiswa ke kelas (enroll)' })
  enrollStudents(@Param('id') id: string, @Body() dto: EnrollStudentsDto) {
    return this.classesService.enrollStudents(+id, dto);
  }

  @Post('courses/:courseId/students')
  @RequirePermissions('classes.update')
  @ApiOperation({
    summary:
      'Memasukkan mahasiswa ke matakuliah spesifik dalam rombel (enroll)',
  })
  enrollCourseStudents(
    @Param('courseId') courseId: string,
    @Body() dto: EnrollStudentsDto,
  ) {
    return this.classesService.enrollCourseStudents(+courseId, dto);
  }

  @Delete('courses/:courseId/students/:studentId')
  @RequirePermissions('classes.update')
  @ApiOperation({ summary: 'Menghapus mahasiswa dari matakuliah dalam rombel' })
  unenrollCourseStudent(
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.classesService.unenrollCourseStudent(+courseId, +studentId);
  }
}
