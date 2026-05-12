import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { LecturerPortalService } from './lecturer-portal.service';

@ApiTags('Public Assignment Upload')
@Controller('api/public/tugas')
export class PublicAssignmentController {
  constructor(private readonly portalService: LecturerPortalService) {}

  @Public()
  @Get(':publicToken')
  @ApiOperation({ summary: 'Get info tugas + list mahasiswa (public, no auth)' })
  getAssignment(@Param('publicToken') publicToken: string) {
    return this.portalService.getPublicAssignment(publicToken);
  }

  @Public()
  @Post(':publicToken/upload')
  @ApiOperation({ summary: 'Submit tugas (public, no auth)' })
  submitAssignment(
    @Param('publicToken') publicToken: string,
    @Body()
    body: {
      studentId: number;
      fileName: string;
      filePath: string;
      fileSize?: number;
      studentNotes?: string;
    },
  ) {
    return this.portalService.submitPublicAssignment(publicToken, body);
  }
}
