import type { ExecutionContext } from '@nestjs/common';

type ThrottleRequest = {
  method?: string;
  url?: string;
  originalUrl?: string;
  route?: {
    path?: string;
  };
};

function isMockEmailProvider() {
  return (process.env.AUTH_EMAIL_PROVIDER?.trim().toLowerCase() || 'mock') === 'mock';
}

export function shouldSkipThrottle(context: ExecutionContext) {
  if (process.env.NODE_ENV === 'production' || !isMockEmailProvider()) {
    return false;
  }

  const request = context.switchToHttp().getRequest<ThrottleRequest>();
  const method = request.method?.toUpperCase();
  const routePath = request.route?.path;
  const requestUrl = request.originalUrl || request.url || '';

  if (method !== 'POST') {
    return false;
  }

  return routePath === '/auth/email/request-code' || requestUrl.includes('/auth/email/request-code');
}
