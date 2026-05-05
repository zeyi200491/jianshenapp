import type { Request } from 'express';

export interface CurrentUserPayload {
  userId: string;
  role?: string;
  tokenType?: string;
  tokenId?: string;
}

export interface RequestWithUser extends Request {
  requestId?: string;
  user?: CurrentUserPayload;
}
