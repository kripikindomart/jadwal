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
  UseGuards,
} from '@nestjs/common';
import { LettersService } from './letters.service';
import {
  CreateLetterTypeDto,
  UpdateLetterTypeDto,
  UpdateLetterRequestStatusDto,
} from './dto/letter.dto';
import {
  CreateLetterTemplateDto,
  UpdateLetterTemplateDto,
} from './dto/letter-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LetterRequestStatus } from '../../database/entities/letter-request.entity';

@Controller('api/letters')
@UseGuards(JwtAuthGuard)
export class LettersController {
  constructor(private readonly lettersService: LettersService) {}

  // ====== Letter Templates ======

  @Get('templates')
  findAllTemplates() {
    return this.lettersService.findAllTemplates();
  }

  @Get('templates/:id')
  findTemplateById(@Param('id', ParseIntPipe) id: number) {
    return this.lettersService.findTemplateById(id);
  }

  @Post('templates')
  createTemplate(@Body() dto: CreateLetterTemplateDto) {
    return this.lettersService.createTemplate(dto);
  }

  @Patch('templates/:id')
  updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLetterTemplateDto,
  ) {
    return this.lettersService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.lettersService.deleteTemplate(id);
  }

  // ====== Letter Types ======

  @Get('types')
  findAllTypes() {
    return this.lettersService.findAllTypes();
  }

  @Get('types/:id')
  findTypeById(@Param('id', ParseIntPipe) id: number) {
    return this.lettersService.findTypeById(id);
  }

  @Post('types')
  createType(@Body() dto: CreateLetterTypeDto) {
    return this.lettersService.createType(dto);
  }

  @Patch('types/:id')
  updateType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLetterTypeDto,
  ) {
    return this.lettersService.updateType(id, dto);
  }

  @Delete('types/:id')
  deleteType(@Param('id', ParseIntPipe) id: number) {
    return this.lettersService.deleteType(id);
  }

  // ====== Letter Requests ======

  @Get('requests')
  findAllRequests(@Query('status') status?: LetterRequestStatus) {
    return this.lettersService.findAllRequests(status);
  }

  @Get('requests/:id')
  findRequestById(@Param('id', ParseIntPipe) id: number) {
    return this.lettersService.findRequestById(id);
  }

  @Patch('requests/:id/status')
  updateRequestStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLetterRequestStatusDto,
  ) {
    return this.lettersService.updateRequestStatus(id, dto);
  }

  @Delete('requests/:id')
  deleteRequest(@Param('id', ParseIntPipe) id: number) {
    return this.lettersService.deleteRequest(id);
  }

  @Patch('requests/:id/data')
  updateRequestData(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { submittedData: any },
  ) {
    if (!body || !body.submittedData) {
      throw new BadRequestException('Data isian form tidak valid');
    }
    return this.lettersService.updateRequestData(id, body.submittedData);
  }

  @Patch('requests/:id/metadata')
  updateRequestMetadata(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      nomorSurat?: string;
      lampiran?: string;
      perihal?: string;
      tanggalSurat?: string;
    },
  ) {
    return this.lettersService.updateRequestMetadata(id, body);
  }

  // ====== Media Library ======
  @Get('media')
  getMediaLibrary() {
    return this.lettersService.getMediaLibrary();
  }

  // ====== Student PIN Management ======
  @Get('students/pins')
  getAllStudentPins(
    @Query('search') search?: string,
    @Query('prodiId') prodiId?: string,
  ) {
    return this.lettersService.getAllStudentPins(
      search,
      prodiId ? parseInt(prodiId) : undefined,
    );
  }

  @Post('students/bulk-generate-pins')
  bulkGeneratePins() {
    return this.lettersService.bulkGeneratePins();
  }

  @Post('students/:id/generate-pin')
  generatePin(@Param('id', ParseIntPipe) id: number) {
    return this.lettersService.generatePin(id);
  }
}
