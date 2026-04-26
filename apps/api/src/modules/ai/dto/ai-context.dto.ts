import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class AiContextDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  dailyPlanId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  dietPlanId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  trainingPlanId?: string;
}

export interface AiConversationContext {
  dailyPlanId?: string;
  dietPlanId?: string;
  trainingPlanId?: string;
}