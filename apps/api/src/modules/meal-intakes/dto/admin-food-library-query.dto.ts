import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminFoodLibraryQueryDto {
  @ApiPropertyOptional({ example: 'rice' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'all'], default: 'all' })
  @IsOptional()
  @IsIn(['active', 'inactive', 'all'])
  status?: 'active' | 'inactive' | 'all';

  @ApiPropertyOptional({ enum: ['canteen', 'cookable'] })
  @IsOptional()
  @IsIn(['canteen', 'cookable'])
  scene?: 'canteen' | 'cookable';
}
