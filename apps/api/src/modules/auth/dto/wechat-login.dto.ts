import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class WechatLoginDto {
  @ApiProperty({ description: '微信登录 code，当前阶段支持 mock code' })
  @IsString()
  @MinLength(4)
  code!: string;
}
