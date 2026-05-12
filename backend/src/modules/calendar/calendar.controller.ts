import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CalendarService } from './calendar.service';

@ApiTags('Calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('ics')
  @ApiOperation({ summary: 'Download jadwal sebagai file .ics (iCal) untuk sync ke Google Calendar / Apple Calendar' })
  async downloadIcs(@Req() req: any, @Res() res: Response) {
    const ics = await this.calendarService.generateIcs(req.user.id);
    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename=jadwal-kuliah.ics',
    });
    res.send(ics);
  }
}
