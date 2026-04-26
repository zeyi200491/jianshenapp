import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength } from 'class-validator';

export class UpsertMealIntakeDto {
  @ApiProperty({ example: 'fried-rice' })
  @IsString()
  @MaxLength(64)
  foodCode!: string;

  @ApiProperty({ enum: ['small', 'medium', 'large'] })
  @IsIn(['small', 'medium', 'large'])
  portionSize!: 'small' | 'medium' | 'large';
}
