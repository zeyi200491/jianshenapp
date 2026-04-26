import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCurrentUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });
  }

  async createDeletionRequest(userId: string, reason: string | null) {
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        user_id: string;
        status: string;
        reason: string | null;
        requested_at: Date;
      }>
    >(
      `
        INSERT INTO data_deletion_requests (user_id, reason)
        VALUES ($1, $2)
        RETURNING id, user_id, status, reason, requested_at
      `,
      userId,
      reason,
    );

    const request = rows[0];
    return {
      id: request.id,
      userId: request.user_id,
      status: request.status,
      reason: request.reason,
      requestedAt: request.requested_at,
    };
  }
}
