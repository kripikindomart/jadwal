import { IsArray, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BulkActionType {
  TRASH = 'trash',
  RESTORE = 'restore',
  DELETE = 'delete',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class BulkIdsDto {
  @ApiProperty({ type: [Number], description: 'Array of item IDs' })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  ids: number[];
}

export class BulkActionDto extends BulkIdsDto {
  @ApiProperty({
    enum: BulkActionType,
    description: 'Action to perform on the items',
  })
  @IsEnum(BulkActionType)
  @IsNotEmpty()
  action: BulkActionType;
}
