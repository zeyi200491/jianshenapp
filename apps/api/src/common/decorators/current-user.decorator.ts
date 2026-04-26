import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CurrentUserPayload, RequestWithUser } from '../types/request-with-user';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  return request.user as CurrentUserPayload;
});
