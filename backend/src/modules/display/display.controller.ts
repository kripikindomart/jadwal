import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { DisplayService } from './display.service';

@ApiTags('Display')
@Controller('api/display')
export class DisplayController {
  constructor(private readonly displayService: DisplayService) {}

  @Public()
  @Get('today-schedule')
  @ApiOperation({ summary: 'Get jadwal hari ini untuk display TV (public, no auth)' })
  getTodaySchedule() {
    return this.displayService.getTodaySchedule();
  }
}
