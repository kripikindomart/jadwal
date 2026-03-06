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
import { ProdisService } from './prodis.service';
import { CreateProdiDto, UpdateProdiDto } from './dto/academic.dto';
import { BulkActionDto } from '../../common/dto/bulk.dto';
import { ILike } from 'typeorm';

@ApiTags('Prodis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/prodis')
export class ProdisController {
  constructor(private readonly service: ProdisService) {}

  @Get()
  @RequirePermissions('prodis.view')
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
    const where = search
      ? [{ name: ILike(`%${search}%`) }, { code: ILike(`%${search}%`) }]
      : {};

    const order = sortKey
      ? { [sortKey]: sortOrder || 'asc' }
      : ({ name: 'ASC' } as any);

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

  @Get(':id')
  @RequirePermissions('prodis.view')
  findOne(@Param('id') id: string) {
    return this.service.findOneOrFail(+id);
  }

  @Post()
  @RequirePermissions('prodis.create')
  create(@Body() dto: CreateProdiDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('prodis.update')
  update(@Param('id') id: string, @Body() dto: UpdateProdiDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  @RequirePermissions('prodis.delete')
  remove(@Param('id') id: string) {
    return this.service.softDelete(+id);
  }

  @Patch(':id/restore')
  @RequirePermissions('prodis.delete')
  restore(@Param('id') id: string) {
    return this.service.restore(+id);
  }

  @Delete(':id/force')
  @RequirePermissions('prodis.delete')
  forceDelete(@Param('id') id: string) {
    return this.service.forceDelete(+id);
  }

  @Post('bulk')
  @RequirePermissions('prodis.delete', 'prodis.update')
  bulkAction(@Body() dto: BulkActionDto) {
    return this.service.processBulkAction(dto.ids, dto.action);
  }
}
