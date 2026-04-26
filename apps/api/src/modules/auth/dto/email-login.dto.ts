import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class EmailLoginDto {
  @ApiProperty({ example: 'student@example.com', description: '登录邮箱' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: '6 位邮箱验证码' })
  @IsString()
  @Length(6, 6)
  code!: string;
}