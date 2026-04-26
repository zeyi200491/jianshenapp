import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class EmailRequestCodeDto {
  @ApiProperty({ example: 'student@example.com', description: '登录邮箱' })
  @IsEmail()
  email!: string;
}