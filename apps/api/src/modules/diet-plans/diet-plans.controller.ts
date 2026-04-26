import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/types/request-with-user';
import { DietPlansService } from './diet-plans.service';

@ApiTags('diet-plans')
@ApiBearerAuth()
@Controller('diet-plans')
export class DietPlansController {
  constructor(private readonly dietPlansService: DietPlansService) {}

  @Get(':id')
  @ApiOperation({ summary: '获取饮食计划详情' })
  getDetail(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.dietPlansService.getDetail(user.userId, id);
  }
}
