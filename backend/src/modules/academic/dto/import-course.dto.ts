import { IsArray, IsNotEmpty, IsObject } from 'class-validator';

export class ImportCourseDto {
  @IsArray()
  @IsNotEmpty()
  data: any[];

  @IsObject()
  @IsNotEmpty()
  mapping: Record<string, string>;
}
