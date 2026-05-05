import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  private isMissingRevokedTokensTableError(error: unknown) {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const code = 'code' in error ? error.code : undefined;
    const meta = 'meta' in error ? error.meta : undefined;
    const table =
      meta && typeof meta === 'object' && 'table' in meta && typeof meta.table === 'string' ? meta.table : undefined;

    return code === 'P2021' && table === 'public.revoked_tokens';
  }

  findAccountByOpenId(provider: string, openId: string) {
    return this.prisma.authAccount.findUnique({
      where: {
        provider_openId: {
          provider,
          openId,
        },
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });
  }

  createUserWithAccount(params: {
    provider: string;
    openId: string;
    unionId: string | null;
    sessionKeyDigest: string;
  }) {
    return this.prisma.user.create({
      data: {
        nickname: 'CampusFit 用户',
        authAccounts: {
          create: {
            provider: params.provider,
            openId: params.openId,
            unionId: params.unionId,
            sessionKeyDigest: params.sessionKeyDigest,
          },
        },
      },
      include: {
        profile: true,
        authAccounts: true,
      },
    });
  }

  async createRevokedToken(params: {
    tokenId: string;
    subject: string;
    tokenType: string;
    expiresAt: Date;
  }) {
    try {
      return await this.prisma.revokedToken.upsert({
        where: {
          tokenId: params.tokenId,
        },
        update: {
          subject: params.subject,
          tokenType: params.tokenType,
          expiresAt: params.expiresAt,
        },
        create: {
          tokenId: params.tokenId,
          subject: params.subject,
          tokenType: params.tokenType,
          expiresAt: params.expiresAt,
        },
      });
    } catch (error) {
      if (this.isMissingRevokedTokensTableError(error)) {
        return undefined;
      }

      throw error;
    }
  }

  async isTokenRevoked(tokenId: string) {
    try {
      const record = await this.prisma.revokedToken.findUnique({
        where: {
          tokenId,
        },
      });

      return Boolean(record);
    } catch (error) {
      if (this.isMissingRevokedTokensTableError(error)) {
        return false;
      }

      throw error;
    }
  }
}
