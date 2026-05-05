import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-guard-spec';
  });

  afterEach(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
      return;
    }

    process.env.JWT_SECRET = originalJwtSecret;
  });

  it('stores only the verified user identity on the request object', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: 'user-1',
        role: 'member',
        type: 'access',
      }),
    };
    const request: Record<string, any> = {
      headers: {
        authorization: 'Bearer user-jwt-token',
      },
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };
    const guard = new JwtAuthGuard(reflector, jwtService as any);

    await expect(guard.canActivate(context as any)).resolves.toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('user-jwt-token', {
      secret: 'test-secret-for-guard-spec',
    });
    expect(request).toMatchObject({
      user: {
        userId: 'user-1',
        role: 'member',
        tokenType: 'access',
      },
    });
    expect(request.user).not.toHaveProperty('accessToken');
  });
});
