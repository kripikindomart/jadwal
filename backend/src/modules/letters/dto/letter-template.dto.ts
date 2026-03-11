import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateLetterTemplateDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  htmlContent?: string;

  @IsString()
  @IsOptional()
  headerImageUrl?: string;

  @IsString()
  @IsOptional()
  signatureImageUrl?: string;

  @IsString()
  @IsOptional()
  signatureName?: string;

  @IsString()
  @IsOptional()
  signatureType?: 'manual' | 'barcode';

  @IsString()
  @IsOptional()
  signatureTitle?: string;

  @IsString()
  @IsOptional()
  signatureLocation?: string;

  @IsString()
  @IsOptional()
  tembusanText?: string;
}

export class UpdateLetterTemplateDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  htmlContent?: string;

  @IsString()
  @IsOptional()
  headerImageUrl?: string;

  @IsString()
  @IsOptional()
  signatureImageUrl?: string;

  @IsString()
  @IsOptional()
  signatureName?: string;

  @IsString()
  @IsOptional()
  signatureType?: 'manual' | 'barcode';

  @IsString()
  @IsOptional()
  signatureTitle?: string;

  @IsString()
  @IsOptional()
  signatureLocation?: string;

  @IsString()
  @IsOptional()
  tembusanText?: string;
}
