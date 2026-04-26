import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

const TRAINING_FOCUSES = ['push', 'pull', 'legs'] as const;

export class ResetTrainingCycleDto {
  @ApiProperty({ enum: TRAINING_FOCUSES })
  @IsIn(TRAINING_FOCUSES)
  startFocus!: string;
}
