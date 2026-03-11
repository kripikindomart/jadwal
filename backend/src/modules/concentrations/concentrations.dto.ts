import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConcentrationDto {
  @ApiProperty({ example: 1, description: 'ID Program Studi' })
  @IsNumber()
  @IsNotEmpty()
  prodiId: number;

  @ApiPropertyOptional({ example: 'MPI', description: 'Kode Konsentrasi' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({
    example: 'Manajemen Pendidikan Islam',
    description: 'Nama Konsentrasi',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: true, description: 'Status Aktif' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateConcentrationDto {
  @ApiPropertyOptional({ example: 1, description: 'ID Program Studi' })
  @IsNumber()
  @IsOptional()
  prodiId?: number;

  @ApiPropertyOptional({ example: 'MPI', description: 'Kode Konsentrasi' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    example: 'Manajemen Pendidikan Islam',
    description: 'Nama Konsentrasi',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: true, description: 'Status Aktif' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
