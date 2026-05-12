import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { LecturerPortalService } from './lecturer-portal.service';

@ApiTags('Lecturer Portal')
@Controller('api/portal/dosen')
export class LecturerPortalController {
  constructor(private readonly portalService: LecturerPortalService) {}

  // ============ HOME ============

  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Validasi token & get info dosen + list kelas' })
  getPortalHome(@Param('token') token: string) {
    return this.portalService.getClasses(token);
  }

  // ============ CLASS DETAIL ============

  @Public()
  @Get(':token/kelas/:classCourseId')
  @ApiOperation({ summary: 'Detail kelas (jadwal, mahasiswa, dosen)' })
  getClassDetail(
    @Param('token') token: string,
    @Param('classCourseId', ParseIntPipe) classCourseId: number,
  ) {
    return this.portalService.getClassDetail(token, classCourseId);
  }

  // ============ MEETINGS / JURNAL ============

  @Public()
  @Get(':token/kelas/:classCourseId/meetings')
  @ApiOperation({ summary: 'List pertemuan' })
  getMeetings(
    @Param('token') token: string,
    @Param('classCourseId', ParseIntPipe) classCourseId: number,
  ) {
    return this.portalService.getMeetings(token, classCourseId);
  }

  @Public()
  @Post(':token/kelas/:classCourseId/meetings/generate')
  @ApiOperation({ summary: 'Auto-generate pertemuan' })
  generateMeetings(
    @Param('token') token: string,
    @Param('classCourseId', ParseIntPipe) classCourseId: number,
  ) {
    return this.portalService.generateMeetings(token, classCourseId);
  }

  @Public()
  @Patch(':token/meetings/:meetingId')
  @ApiOperation({ summary: 'Update jurnal pertemuan (topic, notes, mode)' })
  updateMeeting(
    @Param('token') token: string,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() body: { topic?: string; notes?: string; mode?: string; type?: string; materialFile?: string },
  ) {
    return this.portalService.updateMeeting(token, meetingId, body);
  }

  // ============ ATTENDANCE ============

  @Public()
  @Get(':token/meetings/:meetingId/attendance')
  @ApiOperation({ summary: 'Get absensi mahasiswa per pertemuan' })
  getAttendance(
    @Param('token') token: string,
    @Param('meetingId', ParseIntPipe) meetingId: number,
  ) {
    return this.portalService.getAttendance(token, meetingId);
  }

  @Public()
  @Post(':token/meetings/:meetingId/attendance')
  @ApiOperation({ summary: 'Simpan absensi mahasiswa (bulk)' })
  saveAttendance(
    @Param('token') token: string,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() body: { data: { studentId: number; status: string }[] },
  ) {
    return this.portalService.saveAttendance(token, meetingId, body.data);
  }

  // ============ GRADES ============

  @Public()
  @Get(':token/kelas/:classCourseId/grades')
  @ApiOperation({ summary: 'Get tabel nilai (mahasiswa × komponen)' })
  getGrades(
    @Param('token') token: string,
    @Param('classCourseId', ParseIntPipe) classCourseId: number,
  ) {
    return this.portalService.getGrades(token, classCourseId);
  }

  @Public()
  @Post(':token/kelas/:classCourseId/grades')
  @ApiOperation({ summary: 'Simpan nilai (bulk)' })
  saveGrades(
    @Param('token') token: string,
    @Param('classCourseId', ParseIntPipe) classCourseId: number,
    @Body() body: { data: { studentId: number; gradeComponentId: number; score: number }[] },
  ) {
    return this.portalService.saveGrades(token, classCourseId, body.data);
  }

  // ============ ASSIGNMENTS ============

  @Public()
  @Get(':token/kelas/:classCourseId/assignments')
  @ApiOperation({ summary: 'List tugas' })
  getAssignments(
    @Param('token') token: string,
    @Param('classCourseId', ParseIntPipe) classCourseId: number,
  ) {
    return this.portalService.getAssignments(token, classCourseId);
  }

  @Public()
  @Post(':token/kelas/:classCourseId/assignments')
  @ApiOperation({ summary: 'Buat tugas baru' })
  createAssignment(
    @Param('token') token: string,
    @Param('classCourseId', ParseIntPipe) classCourseId: number,
    @Body() body: { title: string; description?: string; deadline?: string; isGroupTask?: boolean },
  ) {
    return this.portalService.createAssignment(token, classCourseId, body);
  }

  @Public()
  @Get(':token/assignments/:assignmentId/submissions')
  @ApiOperation({ summary: 'List submissions tugas' })
  getSubmissions(
    @Param('token') token: string,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
  ) {
    return this.portalService.getSubmissions(token, assignmentId);
  }

  // ============ ADMIN: TOKEN MANAGEMENT ============

  @Post('admin/generate-token/:lecturerId')
  @ApiOperation({ summary: 'Generate portal token untuk dosen (admin)' })
  generateToken(@Param('lecturerId', ParseIntPipe) lecturerId: number) {
    return this.portalService.generateToken(lecturerId);
  }

  @Delete('admin/revoke-token/:lecturerId')
  @ApiOperation({ summary: 'Cabut portal token dosen (admin)' })
  revokeToken(@Param('lecturerId', ParseIntPipe) lecturerId: number) {
    return this.portalService.revokeToken(lecturerId);
  }
}
