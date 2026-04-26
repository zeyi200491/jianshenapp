import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

const GENDERS = ['male', 'female', 'other'] as const;
const TARGET_TYPES = ['cut', 'maintain', 'bulk'] as const;
const ACTIVITY_LEVELS = ['low', 'light', 'moderate', 'high', 'athlete'] as const;
const TRAINING_EXPERIENCES = ['beginner', 'intermediate'] as const;
const DIET_SCENES = ['canteen', 'dorm', 'home'] as const;

export class UpdateProfileDto {
  @ApiPropertyOptional({ enum: GENDERS })
  @IsOptional()
  @IsIn(GENDERS)
  gender?: string;

  @ApiPropertyOptional({ example: 2004 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(new Date().getFullYear())
  birthYear?: number;

  @ApiPropertyOptional({ example: 175 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(120)
  @Max(230)
  heightCm?: number;

  @ApiPropertyOptional({ example: 72 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(30)
  @Max(300)
  currentWeightKg?: number;

  @ApiPropertyOptional({ enum: TARGET_TYPES })
  @IsOptional()
  @IsIn(TARGET_TYPES)
  targetType?: string;

  @ApiPropertyOptional({ enum: ACTIVITY_LEVELS })
  @IsOptional()
  @IsIn(ACTIVITY_LEVELS)
  activityLevel?: string;

  @ApiPropertyOptional({ enum: TRAINING_EXPERIENCES })
  @IsOptional()
  @IsIn(TRAINING_EXPERIENCES)
  trainingExperience?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(7)
  trainingDaysPerWeek?: number;

  @ApiPropertyOptional({ enum: DIET_SCENES })
  @IsOptional()
  @IsIn(DIET_SCENES)
  dietScene?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(['high_protein', 'low_sugar', 'vegetarian', 'spicy', 'quick_meal'], { each: true })
  dietPreferences?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(['peanut', 'milk', 'seafood', 'spicy', 'fried_food'], { each: true })
  dietRestrictions?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  supplementOptIn?: boolean;
}
