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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { StudentsService } from './students.service';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/students')
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  @Get()
  @RequirePermissions('students.view')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'prodiId', required: false })
  @ApiQuery({ name: 'angkatan', required: false })
  @ApiQuery({ name: 'profileStatus', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('search') search?: string,
    @Query('prodiId') prodiId?: string,
    @Query('angkatan') angkatan?: string,
    @Query('profileStatus') profileStatus?: string,
    @Query('status') status?: 'active' | 'trash' | 'all',
  ) {
    return this.service.findAll({
      page: page ? +page : 1,
      perPage: perPage ? +perPage : 10,
      search,
      prodiId: prodiId ? +prodiId : undefined,
      angkatan: angkatan ? +angkatan : undefined,
      profileStatus,
      status: status || 'active',
    });
  }

  @Get('stats')
  @RequirePermissions('students.view')
  getStats() {
    return this.service.getStats();
  }

  @Get(':id')
  @RequirePermissions('students.view')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post()
  @RequirePermissions('students.create')
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('students.update')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  @RequirePermissions('students.delete')
  remove(@Param('id') id: string) {
    return this.service.softDelete(+id);
  }

  @Patch(':id/restore')
  @RequirePermissions('students.delete')
  restore(@Param('id') id: string) {
    return this.service.restore(+id);
  }

  @Delete(':id/force')
  @RequirePermissions('students.delete')
  forceDelete(@Param('id') id: string) {
    return this.service.forceDelete(+id);
  }

  @Post('bulk')
  @RequirePermissions('students.delete', 'students.update')
  bulkAction(@Body() dto: { ids: number[]; action: string }) {
    return this.service.bulkAction(dto.ids, dto.action);
  }

  @Post('import')
  @RequirePermissions('students.import')
  importStudents(@Body() body: { rows: any[] }) {
    return this.service.importStudents(body.rows);
  }
}
