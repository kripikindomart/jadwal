import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// --- Semesters ---
export class CreateSemesterDto {
  @ApiProperty({ example: '20251' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: '2025/2026 Ganjil' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'ganjil' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  endDate: Date;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateSemesterDto extends CreateSemesterDto {}

// --- Prodis ---
export class CreateProdiDto {
  @ApiProperty({ example: 'TI' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Teknik Informatika' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'S2' })
  @IsString()
  @IsNotEmpty()
  degree: string;
}

export class UpdateProdiDto extends CreateProdiDto {}

// --- Courses ---
export class CreateCourseDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  prodiId: number;

  @ApiProperty({ example: 'MK001' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Rekayasa Perangkat Lunak' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @IsNotEmpty()
  sks: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  semesterDefault?: number;
}

export class UpdateCourseDto extends CreateCourseDto {}

// --- Rooms ---
export class CreateRoomDto {
  @ApiProperty({ example: 'R. 301' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 40 })
  @IsNumber()
  @IsNotEmpty()
  capacity: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isUsable?: boolean;
}

export class UpdateRoomDto extends CreateRoomDto {}

// --- Timeslots ---
export class CreateTimeslotDto {
  @ApiProperty({
    example: 1,
    description: '0=Sunday, 1=Monday, ..., 6=Saturday',
  })
  @IsNumber()
  @IsNotEmpty()
  dayOfWeek: number;

  @ApiProperty({ example: '07:00:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '08:40:00' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isUsable?: boolean;
}

export class UpdateTimeslotDto extends CreateTimeslotDto {}

// --- Grade Components ---
export class CreateGradeComponentDto {
  @ApiProperty({ example: 'UAS' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 40.0 })
  @IsNumber()
  @IsNotEmpty()
  weight: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateGradeComponentDto extends CreateGradeComponentDto {}
