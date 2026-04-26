import { Module } from '@nestjs/common';
import { PlansModule } from '../plans/plans.module';
import { TrainingPlansController } from './training-plans.controller';
import { TrainingPlansService } from './training-plans.service';

@Module({
  imports: [PlansModule],
  controllers: [TrainingPlansController],
  providers: [TrainingPlansService],
})
export class TrainingPlansModule {}
