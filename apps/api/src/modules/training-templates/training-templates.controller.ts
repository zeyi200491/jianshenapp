import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/types/request-with-user';
import { CreateTrainingTemplateDto } from './dto/create-training-template.dto';
import { PreviewTrainingTemplateDto } from './dto/preview-training-template.dto';
import { UpdateTrainingTemplateDto } from './dto/update-training-template.dto';
import { TrainingTemplatesService } from './training-templates.service';

@ApiTags('training-templates')
@ApiBearerAuth()
@Controller('users/me')
export class TrainingTemplatesController {
  constructor(private readonly trainingTemplatesService: TrainingTemplatesService) {}

  @Get('training-templates')
  @ApiOperation({ summary: '获取当前用户训练模板列表' })
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.trainingTemplatesService.list(user.userId);
  }

  @Post('training-templates')
  @ApiOperation({ summary: '创建当前用户训练模板' })
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateTrainingTemplateDto) {
    return this.trainingTemplatesService.create(user.userId, dto);
  }

  @Get('training-templates/:id')
  @ApiOperation({ summary: '获取训练模板详情' })
  getDetail(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.trainingTemplatesService.getDetail(user.userId, id);
  }

  @Patch('training-templates/:id')
  @ApiOperation({ summary: '更新训练模板' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTrainingTemplateDto,
  ) {
    return this.trainingTemplatesService.update(user.userId, id, dto);
  }

  @Post('training-templates/:id/enable')
  @ApiOperation({ summary: '启用训练模板' })
  enable(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.trainingTemplatesService.enable(user.userId, id);
  }

  @Post('training-templates/:id/set-default')
  @ApiOperation({ summary: '设置默认训练模板' })
  setDefault(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.trainingTemplatesService.setDefault(user.userId, id);
  }

  @Get('training-template-preview')
  @ApiOperation({ summary: '预览训练模板某一天内容' })
  preview(@CurrentUser() user: CurrentUserPayload, @Query() dto: PreviewTrainingTemplateDto) {
    return this.trainingTemplatesService.preview(user.userId, dto);
  }
}
