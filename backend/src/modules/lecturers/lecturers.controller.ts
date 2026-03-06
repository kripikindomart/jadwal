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
import { LecturersService } from './lecturers.service';

@ApiTags('Lecturers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/lecturers')
export class LecturersController {
  constructor(private readonly service: LecturersService) {}

  @Get()
  @RequirePermissions('lecturers.view')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'prodiId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('search') search?: string,
    @Query('prodiId') prodiId?: string,
    @Query('status') status?: 'active' | 'trash' | 'all',
  ) {
    return this.service.findAll({
      page: page ? +page : 1,
      perPage: perPage ? +perPage : 10,
      search,
      prodiId: prodiId ? +prodiId : undefined,
      status: status || 'active',
    });
  }

  @Get('stats')
  @RequirePermissions('lecturers.view')
  getStats() {
    return this.service.getStats();
  }

  @Get(':id')
  @RequirePermissions('lecturers.view')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post()
  @RequirePermissions('lecturers.create')
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('lecturers.update')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  @RequirePermissions('lecturers.delete')
  remove(@Param('id') id: string) {
    return this.service.softDelete(+id);
  }

  @Patch(':id/restore')
  @RequirePermissions('lecturers.delete')
  restore(@Param('id') id: string) {
    return this.service.restore(+id);
  }

  @Delete(':id/force')
  @RequirePermissions('lecturers.delete')
  forceDelete(@Param('id') id: string) {
    return this.service.forceDelete(+id);
  }

  @Post('bulk')
  @RequirePermissions('lecturers.delete', 'lecturers.update')
  bulkAction(@Body() dto: { ids: number[]; action: string }) {
    return this.service.bulkAction(dto.ids, dto.action);
  }

  @Post('import')
  @RequirePermissions('lecturers.import')
  importLecturers(@Body() body: { rows: any[] }) {
    return this.service.importLecturers(body.rows);
  }
}
