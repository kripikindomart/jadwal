import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { LettersService } from './letters.service';
import {
  SubmitLetterRequestDto,
  UpdateStudentProfileDto,
} from './dto/letter.dto';
import { Public } from '../../common/decorators/public.decorator';

// Ensure upload directory exists
const uploadDir = './uploads/letters';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller('api/public-letters')
@Public()
export class PublicLettersController {
  constructor(private readonly lettersService: LettersService) {}

  @Get('study-programs')
  getStudyPrograms() {
    return this.lettersService.getStudyPrograms();
  }

  @Get('students/:prodiId')
  getStudentsByProdi(@Param('prodiId', ParseIntPipe) prodiId: number) {
    return this.lettersService.getStudentsByProdi(prodiId);
  }

  @Get('search-students')
  searchStudents(@Query('q') query: string) {
    return this.lettersService.searchStudents(query || '');
  }

  @Get('student-detail/:studentId')
  getStudentDetail(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.lettersService.getStudentDetail(studentId);
  }

  @Post('verify-pin')
  verifyPin(@Body() body: { studentId: number; pin: string }) {
    return this.lettersService.verifyStudentPin(body.studentId, body.pin);
  }

  @Get('lecturers')
  getPublicLecturers(@Query('search') search?: string) {
    return this.lettersService.getPublicLecturers(search);
  }

  @Get('concentrations/:prodiId')
  getPublicConcentrations(@Param('prodiId', ParseIntPipe) prodiId: number) {
    return this.lettersService.getPublicConcentrations(prodiId);
  }

  @Get('types')
  findActiveTypes() {
    return this.lettersService.findActiveTypes();
  }

  @Get('types/:id')
  getTypeWithFields(@Param('id', ParseIntPipe) id: number) {
    return this.lettersService.getPublicTypeWithFields(id);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/letters',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `file-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB Default limit
      },
      fileFilter: (req, file, cb) => {
        // Validation: only allow certain file types
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const mimetypes = /jpeg|jpg|png|pdf|msword|officedocument/;
        const extnameValid = allowedTypes.test(
          extname(file.originalname).toLowerCase(),
        );
        const mimetypeValid = mimetypes.test(file.mimetype);

        if (extnameValid && mimetypeValid) {
          return cb(null, true);
        }
        return cb(
          new BadRequestException(
            'Format file tidak valid. Diizinkan: PDF, JPG, PNG, DOCX.',
          ),
          false,
        );
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan.');
    }
    // Return the URL path
    return {
      url: `/uploads/letters/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
    };
  }

  @Patch('student-profile/:studentId')
  updateStudentProfile(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: UpdateStudentProfileDto,
  ) {
    return this.lettersService.updateStudentProfile(studentId, dto);
  }

  @Post('submit')
  submitRequest(@Body() dto: SubmitLetterRequestDto) {
    return this.lettersService.submitRequest(dto);
  }

  @Get('track/:ticketNumber')
  trackRequest(@Param('ticketNumber') ticketNumber: string) {
    return this.lettersService.trackRequest(ticketNumber);
  }

  @Post('history')
  getStudentHistory(@Body() body: { studentId: number; pin: string }) {
    if (!body.studentId || !body.pin) {
      throw new BadRequestException('ID Mahasiswa dan PIN diperlukan');
    }
    return this.lettersService.getStudentLetterHistory(
      body.studentId,
      body.pin,
    );
  }

  @Get('print/:ticketNumber')
  getApprovedRequestData(@Param('ticketNumber') ticketNumber: string) {
    return this.lettersService.getApprovedRequestData(ticketNumber);
  }
}
