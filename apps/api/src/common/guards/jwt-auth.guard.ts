import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { resolveAllowedOrigins } from '../../config/cors.config';
import { getJwtSecret } from '../../config/security.config';
import { extractAccessTokenFromHeaders } from '../../modules/auth/session-cookie.util';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { assertCookieCsrfProtection } from '../security/csrf.util';
import type { RequestWithUser } from '../types/request-with-user';
import { AppException } from '../utils/app.exception';

function hasBearerAuthorization(authorization: string | string[] | undefined) {
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  return Boolean(header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim());
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = extractAccessTokenFromHeaders({
      authorization: request.headers.authorization,
      cookie: request.headers.cookie,
    });

    if (token && !hasBearerAuthorization(request.headers.authorization)) {
      assertCookieCsrfProtection(request, resolveAllowedOrigins());
    }

    if (!token) {
      throw new AppException('UNAUTHORIZED', '未登录或 token 无效', 401);
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; role?: string; type?: string }>(token, {
        secret: getJwtSecret(),
      });
      request.user = { userId: payload.sub, role: payload.role, tokenType: payload.type };
      return true;
    } catch {
      throw new AppException('UNAUTHORIZED', '未登录或 token 无效', 401);
    }
  }
}
