import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/types/request-with-user';
import { DataDeletionRequestDto } from './dto/data-deletion-request.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息与建档聚合数据' })
  getCurrentUser(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getCurrentUser(user.userId);
  }

  @Post('me/deletion-request')
  @ApiOperation({ summary: '提交当前用户的数据删除申请' })
  requestDataDeletion(@CurrentUser() user: CurrentUserPayload, @Body() dto: DataDeletionRequestDto) {
    return this.usersService.requestDataDeletion(user.userId, dto.reason);
  }
}
