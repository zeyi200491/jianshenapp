import { Module } from '@nestjs/common';
import { AdminFoodLibraryController } from './admin-food-library.controller';
import { MealIntakesController } from './meal-intakes.controller';
import { FoodLibraryRepository } from './food-library.repository';
import { MealIntakesRepository } from './meal-intakes.repository';
import { MealIntakesService } from './meal-intakes.service';

@Module({
  controllers: [MealIntakesController, AdminFoodLibraryController],
  providers: [MealIntakesRepository, FoodLibraryRepository, MealIntakesService],
  exports: [MealIntakesService],
})
export class MealIntakesModule {}
