import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNotEmpty,
  IsEnum,
  IsEmail,
  IsNumber,
  IsObject,
} from 'class-validator';
import { LetterRequestStatus } from '../../../database/entities/letter-request.entity';

// ====== Letter Type DTOs ======
export class CreateLetterTypeDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  allowPreview?: boolean;

  @IsArray()
  @IsOptional()
  fields?: any[];

  @IsNumber()
  @IsOptional()
  templateId?: number;

  @IsObject()
  @IsOptional()
  variableMapping?: Record<string, string>;
}

export class UpdateLetterTypeDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  allowPreview?: boolean;

  @IsArray()
  @IsOptional()
  fields?: any[];

  @IsNumber()
  @IsOptional()
  templateId?: number;

  @IsObject()
  @IsOptional()
  variableMapping?: Record<string, string>;
}

// ====== Letter Request DTOs ======
export class SubmitLetterRequestDto {
  @IsNotEmpty()
  letterTypeId: number;

  @IsString()
  @IsNotEmpty()
  requesterName: string;

  @IsString()
  @IsOptional()
  requesterNim?: string;

  @IsEmail()
  @IsOptional()
  requesterEmail?: string;

  @IsString()
  @IsOptional()
  requesterPhone?: string;

  @IsNumber()
  @IsOptional()
  studentId?: number;

  @IsNumber()
  @IsOptional()
  prodiId?: number;

  @IsOptional()
  submittedData?: Record<string, any>;
}

export class UpdateLetterRequestStatusDto {
  @IsEnum(LetterRequestStatus)
  status: LetterRequestStatus;

  @IsString()
  @IsOptional()
  adminNotes?: string;
}

// ====== Student Profile Update DTO ======
export class UpdateStudentProfileDto {
  @IsString() @IsOptional() gender?: string;
  @IsString() @IsOptional() nirm?: string;
  @IsString() @IsOptional() tempatLahir?: string;
  @IsString() @IsOptional() tanggalLahir?: string;
  @IsOptional() concentrationId?: number;
  @IsString() @IsOptional() konsentrasi?: string;
  @IsString() @IsOptional() judulTesis?: string;
  @IsString() @IsOptional() pembimbing1?: string;
  @IsString() @IsOptional() pembimbing2?: string;
  @IsString() @IsOptional() penguji1?: string;
  @IsString() @IsOptional() penguji2?: string;
  @IsOptional() nilaiPembimbing1?: number;
  @IsOptional() nilaiPembimbing2?: number;
  @IsOptional() nilaiPenguji1?: number;
  @IsOptional() nilaiPenguji2?: number;
  @IsOptional() nilaiKomprehensif?: number;
  @IsString() @IsOptional() pekerjaan?: string;
  @IsString() @IsOptional() alamatRumah?: string;
  @IsString() @IsOptional() alamatKantor?: string;
  @IsString() @IsOptional() nik?: string;
  @IsString() @IsOptional() noTelp?: string;
  @IsOptional() ipk?: number;
  @IsString() @IsOptional() tanggalLulus?: string;
  @IsString() @IsOptional() tanggalSidang?: string;
  @IsString() @IsOptional() masaStudi?: string;
  @IsString() @IsOptional() namaAyah?: string;
  @IsString() @IsOptional() namaIbu?: string;
  @IsString() @IsOptional() keterangan?: string;
  @IsEmail() @IsOptional() email?: string;
}
