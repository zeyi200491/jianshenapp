import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';
import { EmailSenderService } from './modules/auth/email-sender.service';

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailSender: EmailSenderService,
  ) {}

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'campusfit-api',
      dataMode: this.prisma.getMode(),
      authEmail: this.emailSender.describe(),
      timestamp: new Date().toISOString(),
    };
  }
}
