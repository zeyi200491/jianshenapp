import { Module } from '@nestjs/common';
import { PlansModule } from '../plans/plans.module';
import { AiController } from './ai.controller';
import { AiRepository } from './ai.repository';
import { AiService } from './ai.service';

@Module({
  imports: [PlansModule],
  controllers: [AiController],
  providers: [AiService, AiRepository],
})
export class AiModule {}