import { Module } from '@nestjs/common';
import { WeeklyReviewsController } from './weekly-reviews.controller';
import { WeeklyReviewsService } from './weekly-reviews.service';
import { WeeklyReviewsRepository } from './weekly-reviews.repository';

@Module({
  controllers: [WeeklyReviewsController],
  providers: [WeeklyReviewsService, WeeklyReviewsRepository],
  exports: [WeeklyReviewsRepository],
})
export class WeeklyReviewsModule {}
