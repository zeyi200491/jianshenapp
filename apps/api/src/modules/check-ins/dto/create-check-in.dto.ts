import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateCheckInDto {
  @ApiProperty()
  @IsString()
  dailyPlanId!: string;

  @ApiProperty({ example: '2026-03-27' })
  @IsDateString()
  checkinDate!: string;

  @ApiProperty({ example: 80 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  dietCompletionRate!: number;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  trainingCompletionRate!: number;

  @ApiProperty({ required: false, example: 1800 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  waterIntakeMl?: number;

  @ApiProperty({ required: false, example: 7500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stepCount?: number;

  @ApiProperty({ required: false, example: 71.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(20)
  @Max(300)
  weightKg?: number;

  @ApiProperty({ required: false, example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  energyLevel?: number;

  @ApiProperty({ required: false, example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  satietyLevel?: number;

  @ApiProperty({ required: false, example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  fatigueLevel?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
