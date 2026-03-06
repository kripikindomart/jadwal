import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ---------- Instrument DTOs ----------

export class CreateInstrumentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  redirectUrl?: string;

  @IsNumber()
  @IsOptional()
  semesterId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateInstrumentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  redirectUrl?: string;

  @IsNumber()
  @IsOptional()
  semesterId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ---------- Question DTOs ----------

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsEnum(['likert', 'text', 'multiple_choice'])
  @IsOptional()
  type?: 'likert' | 'text' | 'multiple_choice';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  order?: number;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;
}

export class UpdateQuestionDto {
  @IsString()
  @IsOptional()
  text?: string;

  @IsEnum(['likert', 'text', 'multiple_choice'])
  @IsOptional()
  type?: 'likert' | 'text' | 'multiple_choice';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  order?: number;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;
}

export class ReorderQuestionsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  questionIds: number[];
}

// ---------- Submit Response DTO ----------

export class SubmitAnswerDto {
  @IsNumber()
  questionId: number;

  @IsString()
  @IsNotEmpty()
  value: string;
}

export class SubmitResponseDto {
  @IsNumber()
  classCourseId: number;

  @IsNumber()
  lecturerId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers: SubmitAnswerDto[];
}

export class PublicSubmitResponseDto extends SubmitResponseDto {
  @IsNumber()
  studentId: number;
}
