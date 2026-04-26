import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

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
}
