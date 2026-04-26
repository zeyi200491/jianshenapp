import { Module } from '@nestjs/common';
import { PlansModule } from '../plans/plans.module';
import { CheckInsModule } from '../check-ins/check-ins.module';
import { WeeklyReviewsModule } from '../weekly-reviews/weekly-reviews.module';
import { TodayController } from './today.controller';
import { TodayService } from './today.service';

@Module({
  imports: [PlansModule, CheckInsModule, WeeklyReviewsModule],
  controllers: [TodayController],
  providers: [TodayService],
})
export class TodayModule {}
