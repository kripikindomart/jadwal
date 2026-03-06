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
import { GradeComponentsService } from './grade-components.service';
import {
  CreateGradeComponentDto,
  UpdateGradeComponentDto,
} from './dto/academic.dto';
import { BulkActionDto } from '../../common/dto/bulk.dto';
import { ILike } from 'typeorm';

@ApiTags('Grade Components')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/grade-components')
export class GradeComponentsController {
  constructor(private readonly service: GradeComponentsService) {}

  @Get()
  @RequirePermissions('grade_components.view')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'search', required: false })
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
    @Query('search') search?: string,
    @Query('sortKey') sortKey?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('status') status?: 'active' | 'trash' | 'all',
  ) {
    const where = search ? { name: ILike(`%${search}%`) } : {};
    const order = sortKey
      ? { [sortKey]: sortOrder || 'asc' }
      : ({ id: 'DESC' } as any);

    return this.service.findAllPaginated(
      page ? +page : 1,
      perPage ? +perPage : 10,
      where,
      order,
      undefined,
      false,
      status || 'active',
    );
  }

  @Get('ordered')
  @RequirePermissions('grade_components.view')
  findAllOrdered() {
    return this.service.findAllOrdered();
  }

  @Get(':id')
  @RequirePermissions('grade_components.view')
  findOne(@Param('id') id: string) {
    return this.service.findOneOrFail(+id);
  }

  @Post()
  @RequirePermissions('grade_components.create')
  create(@Body() dto: CreateGradeComponentDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('grade_components.update')
  update(@Param('id') id: string, @Body() dto: UpdateGradeComponentDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  @RequirePermissions('grade_components.delete')
  remove(@Param('id') id: string) {
    return this.service.softDelete(+id);
  }

  @Patch(':id/restore')
  @RequirePermissions('grade_components.delete')
  restore(@Param('id') id: string) {
    return this.service.restore(+id);
  }

  @Delete(':id/force')
  @RequirePermissions('grade_components.delete')
  forceDelete(@Param('id') id: string) {
    return this.service.forceDelete(+id);
  }

  @Post('bulk')
  @RequirePermissions('grade_components.delete', 'grade_components.update')
  bulkAction(@Body() dto: BulkActionDto) {
    let updates = null;
    if (dto.action === 'active') updates = { isActive: true };
    else if (dto.action === 'inactive') updates = { isActive: false };

    return this.service.processBulkAction(dto.ids, dto.action, updates);
  }
}
