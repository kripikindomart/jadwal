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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ProdiScopeGuard } from '../../common/guards/prodi-scope.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto } from './dto/academic.dto';
import { BulkActionDto } from '../../common/dto/bulk.dto';
import { ILike, In } from 'typeorm';

@ApiTags('Courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, ProdiScopeGuard)
@Controller('api/courses')
export class CoursesController {
  constructor(private readonly service: CoursesService) {}

  @Get()
  @RequirePermissions('courses.view')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'prodiId', required: false })
  @ApiQuery({ name: 'sortKey', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'trash', 'all'],
  })
  findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('search') search?: string,
    @Query('prodiId') prodiId?: string,
    @Query('sortKey') sortKey?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('status') status?: 'active' | 'trash' | 'all',
  ) {
    const where: any = {};

    if (search) {
      where.name = ILike(`%${search}%`);
      where.code = ILike(`%${search}%`);
    }

    if (prodiId) {
      where.prodiId = +prodiId;
    }

    // Force prodi scope for Staff
    const user = req.user;
    const isSuperAdminOrAdmin = user.roles?.some(
      (r: any) => r.slug === 'superadmin' || r.slug === 'admin',
    );
    if (!isSuperAdminOrAdmin) {
      const allowedProdiIds =
        user.staffProdiAccess?.map((a: any) => a.prodiId) || [];
      if (allowedProdiIds.length > 0) {
        if (!where.prodiId || !allowedProdiIds.includes(where.prodiId)) {
          where.prodiId = In(allowedProdiIds);
        }
      } else if (user.roles?.some((r: any) => r.slug === 'staff')) {
        where.prodiId = -1;
      }
    }

    let finalWhere: any = where;
    if (search && Object.keys(where).length > 2) {
      finalWhere = [
        { ...where, name: ILike(`%${search}%`) },
        { ...where, code: ILike(`%${search}%`) },
      ];
      delete finalWhere[0].code;
      delete finalWhere[1].name;
    } else if (search) {
      finalWhere = [
        { ...where, name: ILike(`%${search}%`) },
        { ...where, code: ILike(`%${search}%`) },
      ];
      delete finalWhere[0].code;
      delete finalWhere[1].name;
    }

    const order = sortKey
      ? { [sortKey]: sortOrder || 'asc' }
      : ({ name: 'ASC' } as any);

    return this.service.findAllPaginated(
      page ? +page : 1,
      perPage ? +perPage : 10,
      finalWhere,
      order,
      ['prodi'],
      false,
      status || 'active',
    );
  }

  @Get(':id')
  @RequirePermissions('courses.view')
  findOne(@Param('id') id: string) {
    return this.service.findOneOrFail(+id, ['prodi']);
  }

  @Post()
  @RequirePermissions('courses.create')
  create(@Body() dto: CreateCourseDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('courses.update')
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  @RequirePermissions('courses.delete')
  remove(@Param('id') id: string) {
    return this.service.softDelete(+id);
  }

  @Patch(':id/restore')
  @RequirePermissions('courses.delete')
  restore(@Param('id') id: string) {
    return this.service.restore(+id);
  }

  @Delete(':id/force')
  @RequirePermissions('courses.delete')
  forceDelete(@Param('id') id: string) {
    return this.service.forceDelete(+id);
  }

  @Post('bulk')
  @RequirePermissions('courses.delete', 'courses.update')
  bulkAction(@Body() dto: BulkActionDto) {
    return this.service.processBulkAction(dto.ids, dto.action);
  }

  @Post('import')
  @RequirePermissions('courses.import')
  importCourses(@Body() body: { rows: any[] }) {
    return this.service.importCourses(body.rows);
  }
}
