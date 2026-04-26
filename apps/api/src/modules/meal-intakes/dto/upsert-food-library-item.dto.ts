import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFoodLibraryItemDto {
  @ApiProperty({ example: 'fried-rice' })
  @IsString()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'Fried rice' })
  @IsString()
  @MaxLength(128)
  name!: string;

  @ApiPropertyOptional({ type: [String], example: ['炒饭'] })
  @IsOptional()
  @IsArray()
  aliases?: string[];

  @ApiPropertyOptional({ type: [String], enum: ['canteen', 'cookable'] })
  @IsOptional()
  @IsArray()
  @IsIn(['canteen', 'cookable'], { each: true })
  sceneTags?: Array<'canteen' | 'cookable'>;

  @ApiPropertyOptional({ type: [String], enum: ['breakfast', 'lunch', 'dinner'] })
  @IsOptional()
  @IsArray()
  @IsIn(['breakfast', 'lunch', 'dinner'], { each: true })
  suggestedMealTypes?: Array<'breakfast' | 'lunch' | 'dinner'>;

  @ApiProperty({ example: 680 })
  @IsNumber()
  calories!: number;

  @ApiProperty({ example: 18 })
  @IsNumber()
  proteinG!: number;

  @ApiProperty({ example: 92 })
  @IsNumber()
  carbG!: number;

  @ApiProperty({ example: 24 })
  @IsNumber()
  fatG!: number;

  @ApiPropertyOptional({ enum: ['active', 'inactive'], default: 'active' })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpsertFoodLibraryItemDto extends CreateFoodLibraryItemDto {}

export class PatchFoodLibraryItemDto extends PartialType(CreateFoodLibraryItemDto) {}
