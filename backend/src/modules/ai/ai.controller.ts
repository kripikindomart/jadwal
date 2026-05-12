import { Controller, Post, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('summarize-journal')
  @ApiOperation({ summary: 'Rangkum jurnal 16 pertemuan menjadi 1 paragraf (AI)' })
  summarizeJournal(@Body() body: { classCourseId: number }) {
    return this.aiService.summarizeJournal(body.classCourseId);
  }

  @Post('generate-survey-questions')
  @ApiOperation({ summary: 'Generate pertanyaan survei dari konteks (AI)' })
  generateSurveyQuestions(@Body() body: { context: string }) {
    return this.aiService.generateSurveyQuestions(body.context);
  }
}
