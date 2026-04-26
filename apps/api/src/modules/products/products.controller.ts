import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: '获取商品列表' })
  list(@Query() query: ProductQueryDto) {
    return this.productsService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取商品详情' })
  getDetail(@Param('id') id: string) {
    return this.productsService.getDetail(id);
  }
}