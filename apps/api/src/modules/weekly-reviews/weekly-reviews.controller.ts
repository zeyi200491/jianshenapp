import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/types/request-with-user';
import {
  GenerateWeeklyReviewDto,
  UpdateWeeklyReviewActionItemDto,
  WeeklyReviewQueryDto,
} from './dto/generate-weekly-review.dto';
import { WeeklyReviewsService } from './weekly-reviews.service';

@ApiTags('weekly-reviews')
@ApiBearerAuth()
@Controller('weekly-reviews')
export class WeeklyReviewsController {
  constructor(private readonly weeklyReviewsService: WeeklyReviewsService) {}

  @Get('latest')
  @ApiOperation({ summary: '获取最新周复盘' })
  getLatest(@CurrentUser() user: CurrentUserPayload, @Query() query: WeeklyReviewQueryDto) {
    return this.weeklyReviewsService.getLatest(user.userId, query.weekStartDate);
  }

  @Post('generate')
  @ApiOperation({ summary: '触发周复盘生成' })
  generate(@CurrentUser() user: CurrentUserPayload, @Body() dto: GenerateWeeklyReviewDto) {
    return this.weeklyReviewsService.generate(user.userId, dto.weekStartDate);
  }

  @Patch('action-items/:actionItemId')
  @ApiOperation({ summary: '更新周行动清单状态' })
  updateActionItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('actionItemId') actionItemId: string,
    @Body() dto: UpdateWeeklyReviewActionItemDto,
  ) {
    return this.weeklyReviewsService.updateActionItem(user.userId, actionItemId, dto.status);
  }
}
