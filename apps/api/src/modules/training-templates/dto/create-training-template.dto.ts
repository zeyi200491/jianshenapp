import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

const TEMPLATE_STATUSES = ['active', 'archived'] as const;
const TEMPLATE_WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const TEMPLATE_DAY_TYPES = ['training', 'rest'] as const;
const TEMPLATE_INTENSITY_LEVELS = ['low', 'medium', 'high'] as const;

export class CreateTrainingTemplateItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  exerciseCode!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  exerciseName!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sets!: number;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  reps!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  repText?: string;

  @ApiPropertyOptional({ enum: ['standard', 'free_text'] })
  @IsOptional()
  @IsString()
  @IsIn(['standard', 'free_text'])
  sourceType?: 'standard' | 'free_text';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rawInput?: string | null;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  restSeconds!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}

export class CreateTrainingTemplateDayDto {
  @ApiProperty({ enum: TEMPLATE_WEEKDAYS })
  @IsIn(TEMPLATE_WEEKDAYS)
  weekday!: string;

  @ApiProperty({ enum: TEMPLATE_DAY_TYPES })
  @IsIn(TEMPLATE_DAY_TYPES)
  dayType!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  title!: string;

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

  @ApiProperty({ type: [CreateTrainingTemplateItemDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateTrainingTemplateItemDto)
  items!: CreateTrainingTemplateItemDto[];
}

export class CreateTrainingTemplateDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name!: string;

  @ApiPropertyOptional({ enum: TEMPLATE_STATUSES, default: 'active' })
  @IsOptional()
  @IsIn(TEMPLATE_STATUSES)
  status?: string = 'active';

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isEnabled?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean = false;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @ApiProperty({ type: [CreateTrainingTemplateDayDto] })
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => CreateTrainingTemplateDayDto)
  days!: CreateTrainingTemplateDayDto[];
}

export {
  TEMPLATE_DAY_TYPES,
  TEMPLATE_INTENSITY_LEVELS,
  TEMPLATE_STATUSES,
  TEMPLATE_WEEKDAYS,
};
