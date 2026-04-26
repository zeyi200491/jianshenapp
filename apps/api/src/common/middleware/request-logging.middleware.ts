import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { RequestWithUser } from '../types/request-with-user';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HttpRequest');

  use(req: RequestWithUser, res: Response, next: NextFunction) {
    const startedAt = Date.now();

    res.on('finish', () => {
      this.logger.log(
        JSON.stringify({
          requestId: req.requestId,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
        }),
      );
    });

    next();
  }
}
