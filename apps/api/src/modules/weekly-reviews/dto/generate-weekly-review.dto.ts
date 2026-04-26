import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class GenerateWeeklyReviewDto {
  @ApiProperty({ example: '2026-03-23' })
  @IsDateString()
  weekStartDate!: string;
}

export class WeeklyReviewQueryDto {
  @ApiPropertyOptional({ example: '2026-03-23' })
  @IsOptional()
  @IsDateString()
  weekStartDate?: string;
}

export class UpdateWeeklyReviewActionItemDto {
  @ApiProperty({ enum: ['pending', 'completed'], example: 'completed' })
  @IsIn(['pending', 'completed'])
  status!: 'pending' | 'completed';
}
