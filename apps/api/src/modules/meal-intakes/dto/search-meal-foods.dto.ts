import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchMealFoodsDto {
  @ApiPropertyOptional({ example: '炒饭' })
  @IsString()
  @MaxLength(30)
  q = '';

  @ApiPropertyOptional({ enum: ['canteen', 'dorm', 'home', 'cookable'] })
  @IsOptional()
  @IsIn(['canteen', 'dorm', 'home', 'cookable'])
  scene?: string;

  @ApiPropertyOptional({ enum: ['breakfast', 'lunch', 'dinner'] })
  @IsOptional()
  @IsIn(['breakfast', 'lunch', 'dinner'])
  mealType?: 'breakfast' | 'lunch' | 'dinner';
}
