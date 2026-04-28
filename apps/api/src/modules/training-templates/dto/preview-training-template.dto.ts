import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { TEMPLATE_WEEKDAYS } from './create-training-template.dto';

export class PreviewTrainingTemplateDto {
  @ApiProperty({ example: '2026-04-28' })
  @IsString()
  date!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ enum: TEMPLATE_WEEKDAYS })
  @IsOptional()
  @IsIn(TEMPLATE_WEEKDAYS)
  weekday?: string;
}
