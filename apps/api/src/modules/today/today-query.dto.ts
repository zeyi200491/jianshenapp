import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class TodayQueryDto {
  @ApiPropertyOptional({ example: '2026-03-27' })
  @IsOptional()
  @IsDateString()
  date?: string;
}
