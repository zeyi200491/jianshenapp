import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ProductQueryDto {
  @ApiPropertyOptional({ description: '分类 slug，例如 supplement' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '目标标签，例如 cut' })
  @IsOptional()
  @IsString()
  targetType?: string;

  @ApiPropertyOptional({ description: '场景标签，例如 dorm' })
  @IsOptional()
  @IsString()
  scene?: string;
}