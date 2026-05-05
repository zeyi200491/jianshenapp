import { createHash } from 'node:crypto';

type JwtPayloadWithJti = {
  jti?: string;
};

export function resolveRevocationTokenId(token: string, payload: JwtPayloadWithJti) {
  return payload.jti?.trim() || createHash('sha256').update(token).digest('hex');
}
