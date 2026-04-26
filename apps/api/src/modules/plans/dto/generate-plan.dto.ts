import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class GeneratePlanDto {
  @ApiProperty({ example: '2026-03-27' })
  @IsDateString()
  date!: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  force = false;
}
