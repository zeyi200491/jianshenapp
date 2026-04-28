import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { TEMPLATE_WEEKDAYS } from '../../training-templates/dto/create-training-template.dto';

export class ApplyTrainingOverrideDto {
  @ApiProperty()
  @IsString()
  templateId!: string;

  @ApiProperty({ enum: TEMPLATE_WEEKDAYS })
  @IsIn(TEMPLATE_WEEKDAYS)
  weekday!: string;
}
