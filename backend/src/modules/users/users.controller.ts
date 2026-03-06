import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import { BulkActionDto } from '../../common/dto/bulk.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.view')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'trash' | 'all',
  ) {
    return this.usersService.findAll(
      parseInt(page ?? '1', 10),
      parseInt(limit ?? '10', 10),
      search,
      status,
    );
  }

  @Get(':id')
  @RequirePermissions('users.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions('users.create')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.softDelete(id);
  }

  @Delete(':id/force')
  @RequirePermissions('users.delete')
  forceDelete(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.forceDelete(id);
  }

  @Patch(':id/restore')
  @RequirePermissions('users.delete')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.restore(id);
  }

  @Post('bulk')
  @RequirePermissions('users.delete', 'users.update')
  bulkAction(@Body() dto: BulkActionDto) {
    return this.usersService.processBulkAction(dto.ids, dto.action);
  }
}
