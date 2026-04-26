import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/types/request-with-user';
import { TrainingPlansService } from './training-plans.service';

@ApiTags('training-plans')
@ApiBearerAuth()
@Controller('training-plans')
export class TrainingPlansController {
  constructor(private readonly trainingPlansService: TrainingPlansService) {}

  @Get(':id')
  @ApiOperation({ summary: '获取训练计划详情' })
  getDetail(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.trainingPlansService.getDetail(user.userId, id);
  }
}
