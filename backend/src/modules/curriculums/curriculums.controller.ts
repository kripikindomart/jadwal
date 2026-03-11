import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ProdiScopeGuard } from '../../common/guards/prodi-scope.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurriculumsService } from './curriculums.service';
import {
  CreateCurriculumDto,
  UpdateCurriculumDto,
  AddCurriculumCourseDto,
  UpdateCurriculumCourseDto,
} from './dto/curriculum.dto';

@ApiTags('Curriculums')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, ProdiScopeGuard)
@Controller('api/curriculums')
export class CurriculumsController {
  constructor(private readonly service: CurriculumsService) {}

  @Get()
  @RequirePermissions('curriculums.view')
  @ApiOperation({ summary: 'Mendapatkan daftar kurikulum sesuai scope staff' })
  findAll(@Req() req: any) {
    const user = req.user;
    let allowedProdiIds: number[] | undefined;

    const isSuperAdminOrAdmin = user.roles?.some(
      (r: any) => r.slug === 'superadmin' || r.slug === 'admin',
    );

    if (!isSuperAdminOrAdmin) {
      const access = user.staffProdiAccess?.map((a: any) => a.prodiId) || [];
      if (access.length > 0) {
        allowedProdiIds = access;
      } else if (user.roles?.some((r: any) => r.slug === 'staff')) {
        // Staff without explicit prodi access sees none
        allowedProdiIds = [-1];
      }
    }

    return this.service.findAll(allowedProdiIds);
  }

  @Get(':id')
  @RequirePermissions('curriculums.view')
  @ApiOperation({ summary: 'Mendapatkan detail kurikulum beserta matkulnya' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post()
  @RequirePermissions('curriculums.create')
  @ApiOperation({ summary: 'Membuat kurikulum baru' })
  create(@Body() dto: CreateCurriculumDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('curriculums.update')
  @ApiOperation({ summary: 'Memperbarui kurikulum' })
  update(@Param('id') id: string, @Body() dto: UpdateCurriculumDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  @RequirePermissions('curriculums.delete')
  @ApiOperation({ summary: 'Menghapus kurikulum (Soft Delete)' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }

  // Curriculum Courses Relation

  @Post(':id/courses')
  @RequirePermissions('curriculums.update')
  @ApiOperation({ summary: 'Menambahkan matakuliah ke dalam kurikulum' })
  addCourse(@Param('id') id: string, @Body() dto: AddCurriculumCourseDto) {
    return this.service.addCourse(+id, dto);
  }

  @Patch(':id/courses/:courseId')
  @RequirePermissions('curriculums.update')
  @ApiOperation({ summary: 'Mengedit data setting matakuliah di kurikulum' })
  updateCourse(
    @Param('id') id: string,
    @Param('courseId') courseId: string,
    @Body() dto: UpdateCurriculumCourseDto,
  ) {
    return this.service.updateCourse(+id, +courseId, dto);
  }

  @Delete(':id/courses/:courseId')
  @RequirePermissions('curriculums.update')
  @ApiOperation({ summary: 'Menghapus matakuliah dari kurikulum' })
  removeCourse(@Param('id') id: string, @Param('courseId') courseId: string) {
    return this.service.removeCourse(+id, +courseId);
  }
}
