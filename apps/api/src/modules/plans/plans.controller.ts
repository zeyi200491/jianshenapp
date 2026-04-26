import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/types/request-with-user';
import { parseDateOnly, toDateOnlyString } from '../../common/utils/date.util';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { PlansService } from './plans.service';

@ApiTags('plans')
@ApiBearerAuth()
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post('generate')
  @ApiOperation({ summary: '手动生成指定日期计划' })
  async generate(@CurrentUser() user: CurrentUserPayload, @Body() dto: GeneratePlanDto) {
    const plan = await this.plansService.generateForDate(user.userId, parseDateOnly(dto.date), dto.force);

    return {
      generated: plan.generated,
      reused: !plan.generated,
      date: toDateOnlyString(plan.planDate),
      dailyPlanId: plan.id,
      summary: {
        calorieTarget: plan.calorieTarget,
        proteinTargetG: plan.proteinTargetG,
        carbTargetG: plan.carbTargetG,
        fatTargetG: plan.fatTargetG,
      },
    };
  }
}
