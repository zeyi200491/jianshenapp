import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { TEMPLATE_WEEKDAYS } from './create-training-template.dto';

export class ApplyTrainingTemplateImportDto {
  @ApiProperty({ example: 'preview-token' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(128)
  previewToken!: string;

  @ApiProperty({ type: [String], enum: TEMPLATE_WEEKDAYS })
  @IsArray()
  @IsIn(TEMPLATE_WEEKDAYS, { each: true })
  selectedWeekdays!: string[];
}
