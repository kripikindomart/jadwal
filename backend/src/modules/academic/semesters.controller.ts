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
import { SemestersService } from './semesters.service';
import { CreateSemesterDto, UpdateSemesterDto } from './dto/academic.dto';
import { BulkActionDto } from '../../common/dto/bulk.dto';

@ApiTags('Semesters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/semesters')
export class SemestersController {
  constructor(private readonly service: SemestersService) {}

  @Get()
  @RequirePermissions('semesters.view')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'sortKey', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'trash', 'all'],
  })
  findAll(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('sortKey') sortKey?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('status') status?: 'active' | 'trash' | 'all',
  ) {
    const where = {};
    const order = sortKey
      ? { [sortKey]: sortOrder || 'asc' }
      : ({ id: 'DESC' } as any);

    return this.service.findAllPaginated(
      page ? +page : 1,
      perPage ? +perPage : 10,
      where,
      order,
      [], // Load relation
      false,
      status || 'active',
    );
  }

  @Get(':id')
  @RequirePermissions('semesters.view')
  findOne(@Param('id') id: string) {
    return this.service.findOneOrFail(+id);
  }

  @Post()
  @RequirePermissions('semesters.create')
  create(@Body() dto: CreateSemesterDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('semesters.update')
  update(@Param('id') id: string, @Body() dto: UpdateSemesterDto) {
    return this.service.update(+id, dto);
  }

  @Patch(':id/set-active')
  @RequirePermissions('semesters.update')
  setActive(@Param('id') id: string) {
    return this.service.setActive(+id);
  }

  @Delete(':id')
  @RequirePermissions('semesters.delete')
  remove(@Param('id') id: string) {
    return this.service.softDelete(+id);
  }

  @Patch(':id/restore')
  @RequirePermissions('semesters.delete')
  restore(@Param('id') id: string) {
    return this.service.restore(+id);
  }

  @Delete(':id/force')
  @RequirePermissions('semesters.delete')
  forceDelete(@Param('id') id: string) {
    return this.service.forceDelete(+id);
  }

  @Post('bulk')
  @RequirePermissions('semesters.delete', 'semesters.update')
  bulkAction(@Body() dto: BulkActionDto) {
    let updates = null;
    if (dto.action === 'active') updates = { isActive: true };
    if (dto.action === 'inactive') updates = { isActive: false };

    return this.service.processBulkAction(dto.ids, dto.action, updates);
  }
}
