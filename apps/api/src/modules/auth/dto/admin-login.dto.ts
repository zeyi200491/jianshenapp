import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'ops@campusfit.ai', description: '管理员邮箱' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'CampusFit123', description: '管理员密码' })
  @IsString()
  @MinLength(8)
  password!: string;
}
