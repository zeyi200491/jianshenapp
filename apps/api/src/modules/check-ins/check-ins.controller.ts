import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/types/request-with-user';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import { CheckInsService } from './check-ins.service';

@ApiTags('check-ins')
@ApiBearerAuth()
@Controller('check-ins')
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @Post()
  @ApiOperation({ summary: '提交当日打卡' })
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateCheckInDto) {
    return this.checkInsService.create(user.userId, dto);
  }

  @Get(':date')
  @ApiOperation({ summary: '获取指定日期打卡详情' })
  getByDate(@CurrentUser() user: CurrentUserPayload, @Param('date') date: string) {
    return this.checkInsService.getByDate(user.userId, date);
  }
}
