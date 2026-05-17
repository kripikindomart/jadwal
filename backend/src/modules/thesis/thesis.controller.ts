import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe, UseGuards, Req, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ThesisService } from './thesis.service';
import { ThesisStatus } from '../../database/entities/thesis-submission.entity';
import { ExamStatus } from '../../database/entities/thesis-exam-schedule.entity';

@ApiTags('Thesis / Tugas Akhir')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/thesis')
export class ThesisController {
  constructor(private readonly thesisService: ThesisService) {}

  private isSuperAdminOrAdmin(user: any): boolean {
    return user.roles?.some((r: any) => r.slug === 'superadmin' || r.slug === 'admin');
  }

  private getAllowedProdiIds(user: any): number[] {
    return user.staffProdiAccess?.map((a: any) => a.prodiId) || [];
  }

  private async assertThesisScope(req: any, thesisId: number) {
    const user = req.user;
    if (this.isSuperAdminOrAdmin(user)) return;

    const allowedProdiIds = this.getAllowedProdiIds(user);
    if (!allowedProdiIds.length) return;

    const thesisProdiId = await this.thesisService.getThesisProdiId(thesisId);
    if (!thesisProdiId || !allowedProdiIds.includes(thesisProdiId)) {
      throw new ForbiddenException('Anda tidak memiliki akses ke data tugas akhir ini.');
    }
  }

  // ============ LIST & DETAIL ============

  @Get()
  @RequirePermissions('thesis.view')
  @ApiOperation({ summary: 'List semua tugas akhir (Kaprodi/Admin)' })
  findAll(
    @Req() req: any,
    @Query('prodiId') prodiId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = req.user;
    const isSuperAdminOrAdmin = this.isSuperAdminOrAdmin(user);
    let finalProdiId: number | number[] | undefined = prodiId
      ? parseInt(prodiId)
      : undefined;

    if (!isSuperAdminOrAdmin) {
      const allowedProdiIds =
        user.staffProdiAccess?.map((a: any) => a.prodiId) || [];
      if (allowedProdiIds.length > 0) {
        if (
          !finalProdiId ||
          (typeof finalProdiId === 'number' &&
            !allowedProdiIds.includes(finalProdiId))
        ) {
          finalProdiId = allowedProdiIds;
        }
      } else if (user.roles?.some((r: any) => r.slug === 'staff')) {
        finalProdiId = -1;
      }
    }

    return this.thesisService.findAll({
      prodiId: finalProdiId,
      status,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('monitoring')
  @RequirePermissions('thesis.view')
  @ApiOperation({ summary: 'Dashboard monitoring tugas akhir (Kaprodi)' })
  getMonitoring(@Req() req: any, @Query('prodiId') prodiId?: string) {
    const user = req.user;
    const isSuperAdminOrAdmin = this.isSuperAdminOrAdmin(user);
    let finalProdiId: number | number[] | undefined = prodiId
      ? parseInt(prodiId)
      : undefined;

    if (!isSuperAdminOrAdmin) {
      const allowedProdiIds =
        user.staffProdiAccess?.map((a: any) => a.prodiId) || [];
      if (allowedProdiIds.length > 0) {
        if (
          !finalProdiId ||
          (typeof finalProdiId === 'number' &&
            !allowedProdiIds.includes(finalProdiId))
        ) {
          finalProdiId = allowedProdiIds;
        }
      } else if (user.roles?.some((r: any) => r.slug === 'staff')) {
        finalProdiId = -1;
      }
    }

    return this.thesisService.getMonitoring(finalProdiId);
  }

  @Get(':id')
  @RequirePermissions('thesis.view')
  @ApiOperation({ summary: 'Detail tugas akhir (pembimbing, penguji, log, sidang)' })
  async findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.assertThesisScope(req, id);
    return this.thesisService.findOne(id);
  }

  @Get(':id/flow')
  @RequirePermissions('thesis.view')
  @ApiOperation({ summary: 'Lihat mode alur prodi + next exam yang diizinkan' })
  async getFlowInfo(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.assertThesisScope(req, id);
    return this.thesisService.getFlowInfo(id);
  }

  @Get(':id/history')
  @RequirePermissions('thesis.view')
  @ApiOperation({ summary: 'Riwayat timeline proses tugas akhir' })
  async getHistory(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.assertThesisScope(req, id);
    return this.thesisService.getHistory(id);
  }

  // ============ STATUS ============

  @Patch(':id/status')
  @RequirePermissions('thesis.manage')
  @ApiOperation({ summary: 'Update status tugas akhir (approve judul, dll)' })
  async updateStatus(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: ThesisStatus },
  ) {
    await this.assertThesisScope(req, id);
    return this.thesisService.updateStatus(id, body.status);
  }

  @Post(':id/transition')
  @RequirePermissions('thesis.manage')
  @ApiOperation({ summary: 'Transisi status terstruktur untuk alur multi-mode' })
  async applyTransition(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      action:
        | 'START_GUIDANCE'
        | 'MOVE_TO_THESIS_GUIDANCE'
        | 'APPROVE_REVISION'
        | 'MARK_COMPLETED';
    },
  ) {
    await this.assertThesisScope(req, id);
    return this.thesisService.applyTransition(id, body.action);
  }

  // ============ MAPPING PEMBIMBING (Kaprodi) ============

  @Post(':id/supervisors')
  @RequirePermissions('thesis.manage')
  @ApiOperation({ summary: 'Kaprodi: Assign/update pembimbing' })
  async assignSupervisor(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { lecturerId: number; role: string; skNumber?: string },
  ) {
    await this.assertThesisScope(req, id);
    return this.thesisService.assignSupervisor(id, body);
  }

  @Delete('supervisors/:supervisorId')
  @RequirePermissions('thesis.manage')
  @ApiOperation({ summary: 'Kaprodi: Hapus pembimbing' })
  removeSupervisor(@Param('supervisorId', ParseIntPipe) supervisorId: number) {
    return this.thesisService.removeSupervisor(supervisorId);
  }

  // ============ JADWAL SIDANG & MAPPING PENGUJI (Kaprodi/Sekprodi) ============

  @Post(':id/exams')
  @RequirePermissions('thesis.manage')
  @ApiOperation({ summary: 'Kaprodi: Jadwalkan sidang (seminar proposal/hasil/akhir)' })
  async scheduleExam(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { type: string; date: string; startTime: string; endTime: string; roomId?: number },
  ) {
    await this.assertThesisScope(req, id);
    return this.thesisService.scheduleExam(id, body);
  }

  @Post('exams/:examId/examiners')
  @RequirePermissions('thesis.manage')
  @ApiOperation({ summary: 'Kaprodi: Assign penguji ke sidang' })
  assignExaminer(
    @Param('examId', ParseIntPipe) examId: number,
    @Body() body: { lecturerId: number; role: string },
  ) {
    return this.thesisService.assignExaminer(examId, body);
  }

  @Delete('examiners/:examinerId')
  @RequirePermissions('thesis.manage')
  @ApiOperation({ summary: 'Kaprodi: Hapus penguji' })
  removeExaminer(@Param('examinerId', ParseIntPipe) examinerId: number) {
    return this.thesisService.removeExaminer(examinerId);
  }

  @Patch('exams/:examId/result')
  @RequirePermissions('thesis.manage')
  @ApiOperation({ summary: 'Kaprodi: Input hasil sidang (lulus/revisi/gagal)' })
  updateExamResult(
    @Param('examId', ParseIntPipe) examId: number,
    @Body() body: { status: ExamStatus; result?: string; score?: number; revisionDeadline?: string; revisionNotes?: string },
  ) {
    return this.thesisService.updateExamResult(examId, body);
  }

  // ============ GUIDANCE LOG ============

  @Post(':id/guidance-logs')
  @RequirePermissions('thesis.manage')
  @ApiOperation({ summary: 'Tambah log bimbingan' })
  async addGuidanceLog(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      lecturerId: number; studentId: number; date: string;
      startTime?: string; endTime?: string; topic: string;
      notes?: string; studentProgress?: string; nextAction?: string;
      chapter?: string; attachmentUrl?: string;
    },
  ) {
    await this.assertThesisScope(req, id);
    return this.thesisService.addGuidanceLog(id, body);
  }
}
