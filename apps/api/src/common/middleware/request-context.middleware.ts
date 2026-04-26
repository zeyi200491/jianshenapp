import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Response } from 'express';
import type { RequestWithUser } from '../types/request-with-user';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: RequestWithUser, _res: Response, next: NextFunction) {
    req.requestId = String(req.headers['x-request-id'] ?? randomUUID());
    next();
  }
}
