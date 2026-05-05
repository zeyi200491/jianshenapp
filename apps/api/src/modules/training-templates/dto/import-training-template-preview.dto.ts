import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ImportTrainingTemplatePreviewDto {
  @ApiProperty({ example: 'template-1', required: false })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  templateId?: string;

  @ApiProperty({
    example: '周二 胸肩三头\n杠铃卧推 8×4\n哑铃飞鸟 8+10+15×2（10kg+7.5kg+5kg）',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  rawText!: string;
}
