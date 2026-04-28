import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/types/request-with-user';
import { ApplyTrainingOverrideDto } from './dto/apply-training-override.dto';
import { TrainingOverridesService } from './training-overrides.service';

@ApiTags('training-overrides')
@ApiBearerAuth()
@Controller('daily-plans/:dailyPlanId/training-override')
export class TrainingOverridesController {
  constructor(private readonly trainingOverridesService: TrainingOverridesService) {}

  @Post()
  @ApiOperation({ summary: '应用用户训练模板到今天' })
  apply(
    @CurrentUser() user: CurrentUserPayload,
    @Param('dailyPlanId') dailyPlanId: string,
    @Body() dto: ApplyTrainingOverrideDto,
  ) {
    return this.trainingOverridesService.apply(user.userId, dailyPlanId, dto);
  }

  @Delete()
  @ApiOperation({ summary: '恢复今天的系统训练方案' })
  remove(@CurrentUser() user: CurrentUserPayload, @Param('dailyPlanId') dailyPlanId: string) {
    return this.trainingOverridesService.remove(user.userId, dailyPlanId);
  }
}
