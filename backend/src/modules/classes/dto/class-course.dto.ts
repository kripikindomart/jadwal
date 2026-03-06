import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsArray,
} from 'class-validator';

export class CreateClassCourseDto {
  @IsNumber()
  @IsNotEmpty()
  courseId: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  onlinePercentage?: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  roomIds?: number[];

  @IsNumber()
  @IsOptional()
  @Min(1)
  totalMeetings?: number;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  timeslotId?: number;

  @IsNumber()
  @IsOptional()
  dayOfWeek?: number;

  @IsString()
  @IsOptional()
  scheduledStartTime?: string;

  @IsString()
  @IsOptional()
  scheduledEndTime?: string;
}

export class UpdateClassCourseDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  onlinePercentage?: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  roomIds?: number[];

  @IsNumber()
  @IsOptional()
  @Min(1)
  totalMeetings?: number;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  timeslotId?: number;

  @IsNumber()
  @IsOptional()
  dayOfWeek?: number;

  @IsString()
  @IsOptional()
  scheduledStartTime?: string;

  @IsString()
  @IsOptional()
  scheduledEndTime?: string;
}
