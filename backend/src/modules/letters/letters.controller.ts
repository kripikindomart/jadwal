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
  BadRequestException,
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
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('api/letters')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LettersController {
  constructor(private readonly lettersService: LettersService) {}

  // ====== Letter Templates ======

  @Get('templates')
  @RequirePermissions('letters.view')
  findAllTemplates() {
    return this.lettersService.findAllTemplates();
  }

  @Get('templates/:id')
  @RequirePermissions('letters.view')
  findTemplateById(@Param('id', ParseIntPipe) id: number) {
    return this.lettersService.findTemplateById(id);
  }

  @Post('templates')
  @RequirePermissions('letters.manage')
  createTemplate(@Body() dto: CreateLetterTemplateDto) {
    return this.lettersService.createTemplate(dto);
  }

  @Patch('templates/:id')
  @RequirePermissions('letters.manage')
  updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLetterTemplateDto,
  ) {
    return this.lettersService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @RequirePermissions('letters.manage')
  deleteTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.lettersService.deleteTemplate(id);
  }

  // ====== Letter Classifications ======

  @Get('classifications')
  @RequirePermissions('letters.view')
  findAllClassifications() {
    return this.lettersService.findAllClassifications();
  }

  @Post('classifications')
  @RequirePermissions('letters.manage')
  createClassification(
    @Body() dto: { code: string; name: string; description?: string },
  ) {
    return this.lettersService.createClassification(dto);
  }

  @Patch('classifications/:id')
  @RequirePermissions('letters.manage')
  updateClassification(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { code?: string; name?: string; description?: string },
  ) {
    return this.lettersService.updateClassification(id, dto);
  }

  @Delete('classifications/:id')
  @RequirePermissions('letters.manage')
  deleteClassification(@Param('id', ParseIntPipe) id: number) {
    return this.lettersService.deleteClassification(id);
  }

  // ====== Letter Types ======

  @Get('types')
  @RequirePermissions('letters.view')
  findAllTypes() {
    return this.lettersService.findAllTypes();
  }

  @Get('types/:id')
  @RequirePermissions('letters.view')
  findTypeById(@Param('id', ParseIntPipe) id: number) {
    return this.lettersService.findTypeById(id);
  }

  @Post('types')
  @RequirePermissions('letters.manage')
  createType(@Body() dto: CreateLetterTypeDto) {
    return this.lettersService.createType(dto);
  }

  @Patch('types/:id')
  @RequirePermissions('letters.manage')
  updateType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLetterTypeDto,
  ) {
    return this.lettersService.updateType(id, dto);
  }

  @Delete('types/:id')
  @RequirePermissions('letters.manage')
  deleteType(@Param('id', ParseIntPipe) id: number) {
    return this.lettersService.deleteType(id);
  }

  // ====== Letter Requests ======

  @Get('requests')
  @RequirePermissions('letters.request.view')
  findAllRequests(@Query('status') status?: LetterRequestStatus) {
    return this.lettersService.findAllRequests(status);
  }

  @Get('requests/:id')
  @RequirePermissions('letters.request.view')
  findRequestById(@Param('id', ParseIntPipe) id: number) {
    return this.lettersService.findRequestById(id);
  }

  @Patch('requests/:id/status')
  @RequirePermissions('letters.request.manage')
  updateRequestStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLetterRequestStatusDto,
  ) {
    return this.lettersService.updateRequestStatus(id, dto);
  }

  @Delete('requests/:id')
  @RequirePermissions('letters.request.manage')
  deleteRequest(@Param('id', ParseIntPipe) id: number) {
    return this.lettersService.deleteRequest(id);
  }

  @Patch('requests/:id/data')
  @RequirePermissions('letters.request.manage')
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
  @RequirePermissions('letters.request.manage')
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
  @RequirePermissions('letters.view')
  getMediaLibrary() {
    return this.lettersService.getMediaLibrary();
  }

  // ====== Student PIN Management ======
  @Get('students/pins')
  @RequirePermissions('letters.pin.manage')
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
  @RequirePermissions('letters.pin.manage')
  bulkGeneratePins() {
    return this.lettersService.bulkGeneratePins();
  }

  @Post('students/:id/generate-pin')
  @RequirePermissions('letters.pin.manage')
  generatePin(@Param('id', ParseIntPipe) id: number) {
    return this.lettersService.generatePin(id);
  }
}
