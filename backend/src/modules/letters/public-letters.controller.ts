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
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import * as dotenv from 'dotenv';
dotenv.config();
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

const s3Config = new S3Client({
  forcePathStyle: true,
  region: process.env.SUPABASE_S3_REGION || 'ap-northeast-1',
  endpoint:
    process.env.SUPABASE_S3_ENDPOINT ||
    'https://thhtumfgfrcjuznfgmoy.storage.supabase.co/storage/v1/s3',
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY || '',
  },
});

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
      storage: multerS3({
        s3: s3Config,
        bucket: process.env.SUPABASE_S3_BUCKET || 'uploads',
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req: any, file: any, cb: any) {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `letters/file-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB Default limit
      },
      fileFilter: (req: any, file: any, cb: any) => {
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
  uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan.');
    }

    const endpoint =
      process.env.SUPABASE_S3_ENDPOINT ||
      'https://thhtumfgfrcjuznfgmoy.storage.supabase.co/storage/v1/s3';
    const publicEndpoint = endpoint.replace('/s3', '/object/public');
    const bucket = process.env.SUPABASE_S3_BUCKET || 'uploads';

    const finalUrl = `${publicEndpoint}/${bucket}/${file.key}`;

    return {
      url: finalUrl,
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
