import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import type { RequestWithUser } from '../types/request-with-user';
import { AppException } from '../utils/app.exception';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
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
      response.status(exception.getStatus()).json({
        code: 'INTERNAL_ERROR',
        message: '服务内部异常',
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
