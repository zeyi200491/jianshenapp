import { Body, Controller, Delete, Get, Param, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/types/request-with-user';
import { SearchMealFoodsDto } from './dto/search-meal-foods.dto';
import { UpsertMealIntakeDto } from './dto/upsert-meal-intake.dto';
import { MealIntakesService } from './meal-intakes.service';

@ApiTags('meal-intakes')
@ApiBearerAuth()
@Controller()
export class MealIntakesController {
  constructor(private readonly mealIntakesService: MealIntakesService) {}

  @Get('meal-foods/search')
  @ApiOperation({ summary: '搜索常见食物候选' })
  searchFoods(@Query() query: SearchMealFoodsDto) {
    return this.mealIntakesService.searchFoods(query.q, query.scene, query.mealType);
  }

  @Put('daily-plans/:dailyPlanId/meals/:mealType/intake')
  @ApiOperation({ summary: '保存某一餐的实际摄入' })
  upsertMealIntake(
    @CurrentUser() user: CurrentUserPayload,
    @Param('dailyPlanId') dailyPlanId: string,
    @Param('mealType') mealType: string,
    @Body() dto: UpsertMealIntakeDto,
  ) {
    return this.mealIntakesService.upsertMealIntake(user.userId, dailyPlanId, mealType, dto);
  }

  @Delete('daily-plans/:dailyPlanId/meals/:mealType/intake')
  @ApiOperation({ summary: '删除某一餐的实际摄入' })
  removeMealIntake(
    @CurrentUser() user: CurrentUserPayload,
    @Param('dailyPlanId') dailyPlanId: string,
    @Param('mealType') mealType: string,
  ) {
    return this.mealIntakesService.removeMealIntake(user.userId, dailyPlanId, mealType);
  }
}
