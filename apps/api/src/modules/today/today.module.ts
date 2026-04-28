import { Module } from '@nestjs/common';
import { PlansModule } from '../plans/plans.module';
import { CheckInsModule } from '../check-ins/check-ins.module';
import { TrainingOverridesModule } from '../training-overrides/training-overrides.module';
import { WeeklyReviewsModule } from '../weekly-reviews/weekly-reviews.module';
import { TodayController } from './today.controller';
import { TodayService } from './today.service';

@Module({
  imports: [PlansModule, CheckInsModule, WeeklyReviewsModule, TrainingOverridesModule],
  controllers: [TodayController],
  providers: [TodayService],
})
export class TodayModule {}
