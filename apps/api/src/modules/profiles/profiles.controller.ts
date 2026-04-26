import { Body, Controller, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { buildInitialProfileSummary, type RuleProfileInput } from '@campusfit/rule-engine';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/types/request-with-user';
import { toDateOnlyString } from '../../common/utils/date.util';
import { PlansService } from '../plans/plans.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { ResetTrainingCycleDto } from './dto/reset-training-cycle.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@ApiBearerAuth()
@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly plansService: PlansService,
  ) {}

  @Post('onboarding')
  @ApiOperation({ summary: '提交建档并触发今日计划生成' })
  async completeOnboarding(@CurrentUser() user: CurrentUserPayload, @Body() dto: OnboardingDto) {
    const profile = await this.profilesService.saveOnboarding(user.userId, dto);
    const plan = await this.plansService.generateForDate(user.userId, new Date(), true);
    const summary = buildInitialProfileSummary(dto as RuleProfileInput);

    return {
      profile,
      initialTargets: summary.nutrition,
      trainingSuggestion: summary.trainingSuggestion,
      generatedPlanDate: toDateOnlyString(plan.planDate),
    };
  }

  @Patch('me')
  @ApiOperation({ summary: '更新当前用户档案' })
  async updateProfile(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpdateProfileDto) {
    const profile = await this.profilesService.updateProfile(user.userId, dto);

    return {
      profile,
      needsPlanRegeneration: true,
    };
  }

  @Post('training-cycle/reset')
  @ApiOperation({ summary: '手动重置训练循环起点' })
  async resetTrainingCycle(@CurrentUser() user: CurrentUserPayload, @Body() dto: ResetTrainingCycleDto) {
    const profile = await this.profilesService.resetTrainingCycle(user.userId, dto.startFocus);

    return {
      profile,
      startFocus: dto.startFocus,
      needsPlanRegeneration: true,
    };
  }
}
