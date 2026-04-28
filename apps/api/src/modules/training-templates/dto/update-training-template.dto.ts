import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  MinLength,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CreateTrainingTemplateItemDto,
  TEMPLATE_DAY_TYPES,
  TEMPLATE_INTENSITY_LEVELS,
  TEMPLATE_STATUSES,
  TEMPLATE_WEEKDAYS,
} from './create-training-template.dto';

export class UpdateTrainingTemplateDayDto {
  @ApiPropertyOptional({ enum: TEMPLATE_WEEKDAYS })
  @IsOptional()
  @IsIn(TEMPLATE_WEEKDAYS)
  weekday?: string;

  @ApiPropertyOptional({ enum: TEMPLATE_DAY_TYPES })
  @IsOptional()
  @IsIn(TEMPLATE_DAY_TYPES)
  dayType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  splitType?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes?: number | null;

  @ApiPropertyOptional({ enum: TEMPLATE_INTENSITY_LEVELS })
  @IsOptional()
  @IsIn(TEMPLATE_INTENSITY_LEVELS)
  intensityLevel?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @ApiPropertyOptional({ type: [CreateTrainingTemplateItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateTrainingTemplateItemDto)
  items?: CreateTrainingTemplateItemDto[];
}

export class UpdateTrainingTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional({ enum: TEMPLATE_STATUSES })
  @IsOptional()
  @IsIn(TEMPLATE_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @ApiPropertyOptional({ type: [UpdateTrainingTemplateDayDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => UpdateTrainingTemplateDayDto)
  days?: UpdateTrainingTemplateDayDto[];
}
