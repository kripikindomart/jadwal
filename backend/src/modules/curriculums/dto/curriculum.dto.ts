import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCurriculumDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  prodiId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  year: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCurriculumDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  year?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AddCurriculumCourseDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  courseId: number;

  @ApiProperty({ default: 1 })
  @IsNumber()
  @IsOptional()
  semester?: number;

  @ApiProperty({ default: 'wajib' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  minGrade?: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsOptional()
  isPackage?: boolean;

  @ApiProperty({ required: false, type: [Number] })
  @IsArray()
  @IsOptional()
  prerequisites?: number[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  concentration?: string;
}

export class UpdateCurriculumCourseDto {
  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  semester?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  minGrade?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isPackage?: boolean;

  @ApiProperty({ required: false, type: [Number] })
  @IsArray()
  @IsOptional()
  prerequisites?: number[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  concentration?: string;
}
