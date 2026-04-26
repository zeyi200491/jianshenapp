import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/types/request-with-user';
import { AiService } from './ai.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai/conversations')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post()
  @ApiOperation({ summary: '创建 AI 会话' })
  createConversation(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateConversationDto) {
    return this.aiService.createConversation(user.userId, dto);
  }

  @Post(':conversationId/messages')
  @ApiOperation({ summary: '发送 AI 消息' })
  sendMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.aiService.sendMessage(user.userId, conversationId, dto);
  }

  @Get(':conversationId/messages')
  @ApiOperation({ summary: '获取 AI 历史消息' })
  listMessages(@CurrentUser() user: CurrentUserPayload, @Param('conversationId') conversationId: string) {
    return this.aiService.listMessages(user.userId, conversationId);
  }
}