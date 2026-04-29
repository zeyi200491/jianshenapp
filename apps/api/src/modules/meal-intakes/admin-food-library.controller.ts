import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminFoodLibraryQueryDto } from './dto/admin-food-library-query.dto';
import { CreateFoodLibraryItemDto, PatchFoodLibraryItemDto } from './dto/upsert-food-library-item.dto';
import { FoodLibraryRepository } from './food-library.repository';

@ApiTags('meal-intakes')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('operator')
@Controller('admin/food-library-items')
export class AdminFoodLibraryController {
  constructor(private readonly foodLibraryRepository: FoodLibraryRepository) {}

  @Get()
  @ApiOperation({ summary: '获取后台食物库列表' })
  list(@Query() query: AdminFoodLibraryQueryDto) {
    return this.foodLibraryRepository.listAdminFoodLibraryItems(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取后台食物库详情' })
  getDetail(@Param('id') id: string) {
    return this.foodLibraryRepository.findAdminFoodLibraryItemById(id);
  }

  @Post()
  @ApiOperation({ summary: '创建后台食物库条目' })
  create(@Body() dto: CreateFoodLibraryItemDto) {
    return this.foodLibraryRepository.createAdminFoodLibraryItem(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新后台食物库条目' })
  update(@Param('id') id: string, @Body() dto: PatchFoodLibraryItemDto) {
    return this.foodLibraryRepository.updateAdminFoodLibraryItem(id, dto);
  }
}
