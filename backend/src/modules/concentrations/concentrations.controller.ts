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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ConcentrationsService } from './concentrations.service';
import {
  CreateConcentrationDto,
  UpdateConcentrationDto,
} from './concentrations.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('concentrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/concentrations')
export class ConcentrationsController {
  constructor(private readonly concentrationsService: ConcentrationsService) {}

  @ApiOperation({ summary: 'Mendapatkan daftar konsentrasi' })
  @ApiQuery({ name: 'prodiId', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @Get()
  findAll(
    @Query('prodiId') prodiId?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'trash' | 'all',
  ) {
    return this.concentrationsService.findAll({
      prodiId: prodiId ? +prodiId : undefined,
      page: page ? +page : 1,
      perPage: perPage ? +perPage : 50,
      search,
      status: status || 'active',
    });
  }

  @ApiOperation({ summary: 'Statistik konsentrasi' })
  @Get('stats')
  getStats() {
    return this.concentrationsService.getStats();
  }

  @ApiOperation({ summary: 'Mendapatkan detail konsentrasi' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.concentrationsService.findOne(id);
  }

  @ApiOperation({ summary: 'Menambahkan konsentrasi baru' })
  @Post()
  create(@Body() createDto: CreateConcentrationDto) {
    return this.concentrationsService.create(createDto);
  }

  @ApiOperation({ summary: 'Mengubah data konsentrasi' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateConcentrationDto,
  ) {
    return this.concentrationsService.update(id, updateDto);
  }

  @ApiOperation({ summary: 'Soft delete konsentrasi' })
  @Delete(':id')
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.concentrationsService.softDelete(id);
  }

  @ApiOperation({ summary: 'Restore konsentrasi' })
  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.concentrationsService.restore(id);
  }

  @ApiOperation({ summary: 'Hapus permanen konsentrasi' })
  @Delete(':id/force')
  forceDelete(@Param('id', ParseIntPipe) id: number) {
    return this.concentrationsService.forceDelete(id);
  }

  @ApiOperation({ summary: 'Bulk action konsentrasi' })
  @Post('bulk')
  bulkAction(@Body() dto: { ids: number[]; action: string }) {
    return this.concentrationsService.bulkAction(dto.ids, dto.action);
  }
}
