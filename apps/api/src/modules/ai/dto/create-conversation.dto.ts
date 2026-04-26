import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { AiContextDto } from './ai-context.dto';

export class CreateConversationDto {
  @ApiPropertyOptional({ description: '会话标题，可选' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  title?: string;

  @ApiPropertyOptional({ type: AiContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiContextDto)
  context?: AiContextDto;
}