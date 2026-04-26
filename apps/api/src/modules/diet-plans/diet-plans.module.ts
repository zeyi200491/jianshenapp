import { Module } from '@nestjs/common';
import { PlansModule } from '../plans/plans.module';
import { DietPlansController } from './diet-plans.controller';
import { DietPlansService } from './diet-plans.service';

@Module({
  imports: [PlansModule],
  controllers: [DietPlansController],
  providers: [DietPlansService],
})
export class DietPlansModule {}
