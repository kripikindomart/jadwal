import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics based on user role' })
  getStats(@Req() req: any) {
    return this.dashboardService.getStats(req.user);
  }

  @Get('today-classes')
  @ApiOperation({ summary: 'Get classes scheduled for today' })
  getTodayClasses(@Req() req: any) {
    return this.dashboardService.getTodayClasses(req.user);
  }

  @Get('semester-info')
  @ApiOperation({ summary: 'Get active semester information' })
  getSemesterInfo() {
    return this.dashboardService.getActiveSemesterInfo();
  }
}
