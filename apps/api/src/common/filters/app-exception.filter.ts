import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import type { ErrorCode } from '../types/error-code';
import type { RequestWithUser } from '../types/request-with-user';
import { AppException } from '../utils/app.exception';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private resolveCodeFromStatus(status: number): ErrorCode {
    switch (status) {
      case 400:
        return 'VALIDATION_ERROR';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 429:
        return 'TOO_MANY_REQUESTS';
      default:
        return 'INTERNAL_ERROR';
    }
  }

  private normalizeHttpException(exception: HttpException) {
    const status = exception.getStatus();
    const payload = exception.getResponse();
    const fallbackCode = this.resolveCodeFromStatus(status);

    if (typeof payload === 'string') {
      const normalizedPayload =
        fallbackCode === 'TOO_MANY_REQUESTS' && /ThrottlerException|Too Many Requests/i.test(payload)
          ? '请求过于频繁，请稍后再试'
          : payload;
      return {
        status,
        code: fallbackCode,
        message: normalizedPayload,
      };
    }

    const payloadObject =
      typeof payload === 'object' && payload !== null
        ? (payload as { message?: string | string[]; code?: string })
        : null;
    const messageValue = Array.isArray(payloadObject?.message)
      ? payloadObject.message.join('; ')
      : payloadObject?.message;
    const codeValue = typeof payloadObject?.code === 'string' ? payloadObject.code : fallbackCode;
    const normalizedMessage =
      codeValue === 'TOO_MANY_REQUESTS' &&
      typeof messageValue === 'string' &&
      /ThrottlerException|Too Many Requests/i.test(messageValue)
        ? '请求过于频繁，请稍后再试'
        : messageValue;

    return {
      status,
      code: codeValue as ErrorCode,
      message:
        typeof normalizedMessage === 'string' && normalizedMessage.trim().length > 0
          ? normalizedMessage
          : exception.message,
    };
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<RequestWithUser>();

    if (exception instanceof AppException) {
      response.status(exception.getStatus()).json({
        code: exception.code,
        message: exception.message,
        data: null,
        requestId: request.requestId,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const normalized = this.normalizeHttpException(exception);
      response.status(normalized.status).json({
        code: normalized.code,
        message: normalized.message,
        data: null,
        requestId: request.requestId,
      });
      return;
    }

    response.status(500).json({
      code: 'INTERNAL_ERROR',
      message: '服务内部异常',
      data: null,
      requestId: request.requestId,
    });
  }
}
