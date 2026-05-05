import { AuthRepository } from './auth.repository';

describe('AuthRepository', () => {
  function createRepository(prismaOverrides?: Partial<Record<'revokedToken', Record<string, jest.Mock>>>) {
    const prisma = {
      revokedToken: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      ...prismaOverrides,
    };

    return {
      repository: new AuthRepository(prisma as any),
      prisma,
    };
  }

  it('treats a missing revoked_tokens table as not revoked', async () => {
    const { repository, prisma } = createRepository({
      revokedToken: {
        findUnique: jest.fn().mockRejectedValue({
          code: 'P2021',
          meta: { table: 'public.revoked_tokens' },
        }),
        upsert: jest.fn(),
      },
    });

    await expect(repository.isTokenRevoked('token-1')).resolves.toBe(false);
    expect(prisma.revokedToken.findUnique).toHaveBeenCalledWith({
      where: {
        tokenId: 'token-1',
      },
    });
  });

  it('skips token revocation persistence when revoked_tokens is unavailable', async () => {
    const { repository, prisma } = createRepository({
      revokedToken: {
        findUnique: jest.fn(),
        upsert: jest.fn().mockRejectedValue({
          code: 'P2021',
          meta: { table: 'public.revoked_tokens' },
        }),
      },
    });

    await expect(
      repository.createRevokedToken({
        tokenId: 'token-1',
        subject: 'user-1',
        tokenType: 'access',
        expiresAt: new Date('2026-05-05T10:00:00.000Z'),
      }),
    ).resolves.toBeUndefined();

    expect(prisma.revokedToken.upsert).toHaveBeenCalled();
  });

  it('still surfaces unexpected revocation lookup errors', async () => {
    const { repository } = createRepository({
      revokedToken: {
        findUnique: jest.fn().mockRejectedValue(new Error('boom')),
        upsert: jest.fn(),
      },
    });

    await expect(repository.isTokenRevoked('token-1')).rejects.toThrow('boom');
  });
});
