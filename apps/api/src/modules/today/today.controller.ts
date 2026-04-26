import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/types/request-with-user';
import { TodayQueryDto } from './today-query.dto';
import { TodayService } from './today.service';

@ApiTags('today')
@ApiBearerAuth()
@Controller('today')
export class TodayController {
  constructor(private readonly todayService: TodayService) {}

  @Get()
  @ApiOperation({ summary: '获取今日页聚合数据' })
  getToday(@CurrentUser() user: CurrentUserPayload, @Query() query: TodayQueryDto) {
    return this.todayService.getToday(user.userId, query.date);
  }
}
