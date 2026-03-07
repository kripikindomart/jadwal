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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SurveysService } from './surveys.service';
import {
  CreateInstrumentDto,
  UpdateInstrumentDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  ReorderQuestionsDto,
  SubmitResponseDto,
} from './dto/survey.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Surveys')
@Controller('api/surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  // ============ INSTRUMENTS ============

  @Get()
  @ApiOperation({ summary: 'List semua instrumen survei' })
  findAll(@Query() query: any) {
    return this.surveysService.findAllInstruments(query);
  }

  @Post()
  @RequirePermissions('surveys.manage')
  @ApiOperation({ summary: 'Buat instrumen survei baru' })
  create(@Body() dto: CreateInstrumentDto) {
    return this.surveysService.createInstrument(dto);
  }

  @Get('my-pending')
  @ApiOperation({ summary: 'List survei yang belum diisi oleh mahasiswa' })
  getMyPending(@Req() req: any) {
    return this.surveysService.getMyPendingSurveys(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail instrumen survei dengan pertanyaan' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.surveysService.findInstrumentById(id);
  }

  @Patch(':id')
  @RequirePermissions('surveys.manage')
  @ApiOperation({ summary: 'Update instrumen survei' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInstrumentDto,
  ) {
    return this.surveysService.updateInstrument(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('surveys.manage')
  @ApiOperation({ summary: 'Hapus instrumen survei' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.surveysService.deleteInstrument(id);
  }

  @Post(':id/duplicate')
  @RequirePermissions('surveys.manage')
  @ApiOperation({ summary: 'Duplikasi instrumen survei' })
  duplicate(@Param('id', ParseIntPipe) id: number) {
    return this.surveysService.duplicateInstrument(id);
  }

  // ============ QUESTIONS ============

  @Post(':id/questions')
  @RequirePermissions('surveys.manage')
  @ApiOperation({ summary: 'Tambah pertanyaan ke instrumen' })
  addQuestion(
    @Param('id', ParseIntPipe) instrumentId: number,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.surveysService.addQuestion(instrumentId, dto);
  }

  @Patch('questions/:id')
  @RequirePermissions('surveys.manage')
  @ApiOperation({ summary: 'Update pertanyaan' })
  updateQuestion(
    @Param('id', ParseIntPipe) questionId: number,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.surveysService.updateQuestion(questionId, dto);
  }

  @Delete('questions/:id')
  @RequirePermissions('surveys.manage')
  @ApiOperation({ summary: 'Hapus pertanyaan' })
  deleteQuestion(@Param('id', ParseIntPipe) questionId: number) {
    return this.surveysService.deleteQuestion(questionId);
  }

  @Post(':id/reorder')
  @RequirePermissions('surveys.manage')
  @ApiOperation({ summary: 'Reorder pertanyaan' })
  reorderQuestions(
    @Param('id', ParseIntPipe) instrumentId: number,
    @Body() dto: ReorderQuestionsDto,
  ) {
    return this.surveysService.reorderQuestions(instrumentId, dto.questionIds);
  }

  // ============ FORM & SUBMIT ============

  @Get(':instrumentId/form/:classCourseId/:lecturerId')
  @ApiOperation({ summary: 'Get form data untuk mahasiswa' })
  getForm(
    @Param('instrumentId', ParseIntPipe) instrumentId: number,
    @Param('classCourseId', ParseIntPipe) classCourseId: number,
    @Param('lecturerId', ParseIntPipe) lecturerId: number,
  ) {
    return this.surveysService.getFormData(
      instrumentId,
      classCourseId,
      lecturerId,
    );
  }

  @Post(':instrumentId/submit')
  @ApiOperation({ summary: 'Submit response survei (mahasiswa)' })
  submit(
    @Param('instrumentId', ParseIntPipe) instrumentId: number,
    @Req() req: any,
    @Body() dto: SubmitResponseDto,
  ) {
    return this.surveysService.submitResponse(instrumentId, req.user.id, dto);
  }

  // ============ RESULTS ============

  @Get(':id/results')
  @RequirePermissions('surveys.manage')
  @ApiOperation({ summary: 'Lihat hasil survei (admin)' })
  getResults(@Param('id', ParseIntPipe) id: number, @Query() query: any) {
    return this.surveysService.getResults(id, query);
  }

  @Get(':id/respondents')
  @RequirePermissions('surveys.manage')
  @ApiOperation({ summary: 'Lihat daftar responden survei per rombel' })
  getRespondents(@Param('id', ParseIntPipe) id: number, @Query() query: any) {
    return this.surveysService.getRespondents(id, query);
  }

  @Delete(':id/responses/:responseId')
  @RequirePermissions('surveys.manage')
  @ApiOperation({ summary: 'Hapus/reset response mahasiswa' })
  deleteResponse(
    @Param('id', ParseIntPipe) id: number,
    @Param('responseId', ParseIntPipe) responseId: number,
  ) {
    return this.surveysService.deleteResponse(id, responseId);
  }

  @Delete(':id/reset')
  @RequirePermissions('surveys.manage')
  @ApiOperation({ summary: 'Reset seluluh data survei (opsional per rombel)' })
  resetData(
    @Param('id', ParseIntPipe) id: number,
    @Query('classId') classId?: string,
  ) {
    return this.surveysService.resetData(
      id,
      classId ? parseInt(classId) : undefined,
    );
  }
}
