import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { DIET_PREFERENCES, DIET_RESTRICTIONS } from './diet-option.constants';

const GENDERS = ['male', 'female', 'other'] as const;
const TARGET_TYPES = ['cut', 'maintain', 'bulk'] as const;
const ACTIVITY_LEVELS = ['low', 'light', 'moderate', 'high', 'athlete'] as const;
const TRAINING_EXPERIENCES = ['beginner', 'intermediate'] as const;
const DIET_SCENES = ['canteen', 'dorm', 'home'] as const;

export class OnboardingDto {
  @ApiProperty({ enum: GENDERS })
  @IsIn(GENDERS)
  gender!: string;

  @ApiProperty({ example: 2004 })
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(new Date().getFullYear())
  birthYear!: number;

  @ApiProperty({ example: 175 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(120)
  @Max(230)
  heightCm!: number;

  @ApiProperty({ example: 72 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(30)
  @Max(300)
  currentWeightKg!: number;

  @ApiProperty({ enum: TARGET_TYPES })
  @IsIn(TARGET_TYPES)
  targetType!: string;

  @ApiProperty({ enum: ACTIVITY_LEVELS })
  @IsIn(ACTIVITY_LEVELS)
  activityLevel!: string;

  @ApiProperty({ enum: TRAINING_EXPERIENCES })
  @IsIn(TRAINING_EXPERIENCES)
  trainingExperience!: string;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(7)
  trainingDaysPerWeek!: number;

  @ApiProperty({ enum: DIET_SCENES })
  @IsIn(DIET_SCENES)
  dietScene!: string;

  @ApiProperty({ type: [String], required: false, default: [] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(DIET_PREFERENCES, { each: true })
  dietPreferences: string[] = [];

  @ApiProperty({ type: [String], required: false, default: [] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(DIET_RESTRICTIONS, { each: true })
  dietRestrictions: string[] = [];

  @ApiProperty({ example: true })
  @Type(() => Boolean)
  @IsBoolean()
  supplementOptIn!: boolean;
}
