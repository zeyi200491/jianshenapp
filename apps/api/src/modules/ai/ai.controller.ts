import type { Request, Response } from 'express';
import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/types/request-with-user';
import { AppException } from '../../common/utils/app.exception';
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
    return this.aiService.sendMessage(user, conversationId, dto);
  }

  @Post(':conversationId/messages/stream')
  @ApiOperation({ summary: '流式发送 AI 消息' })
  async streamMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const abortController = new AbortController();
    request.on('close', () => abortController.abort());

    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders?.();

    try {
      for await (const event of this.aiService.sendMessageStream(user, conversationId, dto, undefined, abortController.signal)) {
        this.writeSseEvent(response, event.type, event);
      }
    } catch (error) {
      const appError =
        error instanceof AppException
          ? error
          : new AppException('AI_TIMEOUT', 'AI 服务暂时不可用，请稍后重试', 502);
      this.writeSseEvent(response, 'error', {
        code: appError.code,
        message: String(appError.message),
      });
    } finally {
      response.end();
    }
  }

  @Get(':conversationId/messages')
  @ApiOperation({ summary: '获取 AI 历史消息' })
  listMessages(@CurrentUser() user: CurrentUserPayload, @Param('conversationId') conversationId: string) {
    return this.aiService.listMessages(user.userId, conversationId);
  }

  private writeSseEvent(response: Response, event: string, data: unknown) {
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}
