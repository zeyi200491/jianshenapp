import { Module } from '@nestjs/common';
import { CheckInsController } from './check-ins.controller';
import { CheckInsService } from './check-ins.service';
import { CheckInsRepository } from './check-ins.repository';

@Module({
  controllers: [CheckInsController],
  providers: [CheckInsService, CheckInsRepository],
  exports: [CheckInsRepository],
})
export class CheckInsModule {}
