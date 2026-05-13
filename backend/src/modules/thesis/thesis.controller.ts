import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe, UseGuards, Req,
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

  // ============ LIST & DETAIL ============

  @Get()
  @RequirePermissions('thesis.view')
  @ApiOperation({ summary: 'List semua tugas akhir (Kaprodi/Admin)' })
  findAll(
    @Query('prodiId') prodiId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.thesisService.findAll({
      prodiId: prodiId ? parseInt(prodiId) : undefined,
      status,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('monitoring')
  @RequirePermissions('thesis.view')
  @ApiOperation({ summary: 'Dashboard monitoring tugas akhir (Kaprodi)' })
  getMonitoring(@Query('prodiId') prodiId?: string) {
    return this.thesisService.getMonitoring(prodiId ? parseInt(prodiId) : undefined);
  }

  @Get(':id')
  @RequirePermissions('thesis.view')
  @ApiOperation({ summary: 'Detail tugas akhir (pembimbing, penguji, log, sidang)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.thesisService.findOne(id);
  }

  // ============ STATUS ============

  @Patch(':id/status')
  @RequirePermissions('thesis.manage')
  @ApiOperation({ summary: 'Update status tugas akhir (approve judul, dll)' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: ThesisStatus },
  ) {
    return this.thesisService.updateStatus(id, body.status);
  }

  // ============ MAPPING PEMBIMBING (Kaprodi) ============

  @Post(':id/supervisors')
  @RequirePermissions('thesis.manage')
  @ApiOperation({ summary: 'Kaprodi: Assign/update pembimbing' })
  assignSupervisor(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { lecturerId: number; role: string; skNumber?: string },
  ) {
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
  scheduleExam(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { type: string; date: string; startTime: string; endTime: string; roomId?: number },
  ) {
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
  addGuidanceLog(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      lecturerId: number; studentId: number; date: string;
      startTime?: string; endTime?: string; topic: string;
      notes?: string; studentProgress?: string; nextAction?: string;
      chapter?: string; attachmentUrl?: string;
    },
  ) {
    return this.thesisService.addGuidanceLog(id, body);
  }
}
