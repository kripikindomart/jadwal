import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
} from 'class-validator';

export class CreateClassDto {
  // courseId is removed from base Class

  @IsNumber()
  @IsNotEmpty()
  semesterId: number;

  @IsNumber()
  @IsNotEmpty()
  prodiId: number;

  @IsString()
  @IsNotEmpty()
  name: string; // e.g., 'Kelas A', 'Kelas B'

  @IsNumber()
  @IsOptional()
  @Min(1)
  quota?: number;
}

export class UpdateClassDto {
  // courseId is removed

  @IsNumber()
  @IsOptional()
  semesterId?: number;

  @IsNumber()
  @IsOptional()
  prodiId?: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  quota?: number;
}

export class AssignLecturersDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  lecturerIds: number[];
}

export class EnrollStudentsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  studentIds: number[];
}

export class GenerateScheduleDto {
  @IsNumber()
  @IsNotEmpty()
  semesterId: number;

  @IsNumber()
  @IsOptional()
  classId?: number;
}
