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
import { TimeslotsService } from './timeslots.service';
import { CreateTimeslotDto, UpdateTimeslotDto } from './dto/academic.dto';
import { BulkActionDto } from '../../common/dto/bulk.dto';
import { ILike } from 'typeorm';

@ApiTags('Timeslots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/timeslots')
export class TimeslotsController {
  constructor(private readonly service: TimeslotsService) {}

  @Get()
  @RequirePermissions('timeslots.view')
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
    const where = {}; // No string search for timeslots initially
    const order = sortKey
      ? { [sortKey]: sortOrder || 'asc' }
      : ({ dayOfWeek: 'ASC', startTime: 'ASC' } as any);

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
  @RequirePermissions('timeslots.view')
  findAllOrdered() {
    return this.service.findAllOrdered();
  }

  @Get(':id')
  @RequirePermissions('timeslots.view')
  findOne(@Param('id') id: string) {
    return this.service.findOneOrFail(+id);
  }

  @Post()
  @RequirePermissions('timeslots.create')
  create(@Body() dto: CreateTimeslotDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('timeslots.update')
  update(@Param('id') id: string, @Body() dto: UpdateTimeslotDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  @RequirePermissions('timeslots.delete')
  remove(@Param('id') id: string) {
    return this.service.softDelete(+id);
  }

  @Patch(':id/restore')
  @RequirePermissions('timeslots.delete')
  restore(@Param('id') id: string) {
    return this.service.restore(+id);
  }

  @Delete(':id/force')
  @RequirePermissions('timeslots.delete')
  forceDelete(@Param('id') id: string) {
    return this.service.forceDelete(+id);
  }

  @Post('bulk')
  @RequirePermissions('timeslots.delete', 'timeslots.update')
  bulkAction(@Body() dto: BulkActionDto) {
    let updates = null;
    if (dto.action === 'active') updates = { isUsable: true };
    else if (dto.action === 'inactive') updates = { isUsable: false };

    return this.service.processBulkAction(dto.ids, dto.action, updates);
  }
}
