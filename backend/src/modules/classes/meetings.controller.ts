import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { MeetingsService } from './meetings.service';

@ApiTags('Meetings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get('class-course/:classCourseId')
  @RequirePermissions('classes.view')
  @ApiOperation({ summary: 'List semua pertemuan untuk sebuah class course' })
  findByClassCourse(@Param('classCourseId', ParseIntPipe) classCourseId: number) {
    return this.meetingsService.findByClassCourse(classCourseId);
  }

  @Post('class-course/:classCourseId/generate')
  @RequirePermissions('classes.update')
  @ApiOperation({ summary: 'Auto-generate pertemuan (16 default) untuk class course' })
  generate(
    @Param('classCourseId', ParseIntPipe) classCourseId: number,
    @Body() body: { totalMeetings?: number },
  ) {
    return this.meetingsService.generate(classCourseId, body.totalMeetings);
  }

  @Get(':id')
  @RequirePermissions('classes.view')
  @ApiOperation({ summary: 'Detail satu pertemuan' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.meetingsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('classes.update')
  @ApiOperation({ summary: 'Update pertemuan (jurnal: topic, notes, mode, type)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      topic?: string;
      notes?: string;
      mode?: string;
      type?: string;
      date?: string;
      materialFile?: string;
    },
  ) {
    return this.meetingsService.update(id, body);
  }

  @Post(':id/lock')
  @RequirePermissions('classes.update')
  @ApiOperation({ summary: 'Lock pertemuan (tidak bisa diedit lagi)' })
  lock(@Param('id', ParseIntPipe) id: number) {
    return this.meetingsService.lock(id);
  }

  @Post(':id/unlock')
  @RequirePermissions('classes.update')
  @ApiOperation({ summary: 'Unlock pertemuan' })
  unlock(@Param('id', ParseIntPipe) id: number) {
    return this.meetingsService.unlock(id);
  }
}
