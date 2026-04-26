import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { EmailSenderService } from './email-sender.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, EmailSenderService],
  exports: [EmailSenderService],
})
export class AuthModule {}