const path = require('path');
const { AppException } = require(path.join(__dirname, '../../common/utils/app.exception.ts'));
const { AuthService } = require(path.join(__dirname, 'auth.service.ts'));

describe('AuthService', () => {
  const previousEnv = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    process.env.AUTH_EMAIL_PROVIDER = 'mock';
    delete process.env.AUTH_EMAIL_DEV_CODE_VISIBLE;
    process.env.AUTH_OTP_COOLDOWN_SECONDS = '60';
    process.env.AUTH_OTP_MAX_ATTEMPTS = '5';
    process.env.AUTH_OTP_TTL_SECONDS = '600';
    process.env.JWT_SECRET = 'test-secret-for-auth-service-spec';
  });

  afterEach(() => {
    process.env = { ...previousEnv };
  });

  function createService() {
    const repository = {
      findUserById: jest.fn(),
      findAccountByOpenId: jest.fn(),
      createUserWithAccount: jest.fn(),
      createRevokedToken: jest.fn().mockResolvedValue(undefined),
    };
    const jwtService = {
      signAsync: jest.fn().mockImplementation(async (payload) =>
        typeof payload?.type === 'string' && payload.type.includes('refresh') ? 'refresh-token' : 'access-token',
      ),
      verifyAsync: jest.fn().mockImplementation(async (token) => {
        if (token === 'access-token') {
          return {
            sub: 'user-1',
            type: 'access',
            jti: 'access-jti',
            exp: Math.floor(Date.now() / 1000) + 3600,
          };
        }

        return {
          sub: 'user-1',
          type: 'refresh',
          jti: 'refresh-jti',
          exp: Math.floor(Date.now() / 1000) + 7200,
        };
      }),
    };
    const emailSender = {
      isMockProvider: jest.fn().mockReturnValue(true),
      describe: jest.fn().mockReturnValue({
        provider: 'mock',
        ready: true,
        issue: null,
      }),
      sendOtpEmail: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AuthService(repository, jwtService, emailSender);
    return { service, repository, jwtService, emailSender };
  }

  it('exposes devCode by default in development when using the mock provider', async () => {
    const { service, emailSender } = createService();

    const result = await service.requestEmailOtp('student@example.com');

    expect(result.channel).toBe('email');
    expect(result.deliveryMode).toBe('mock');
    expect(result.expiresInSeconds).toBeGreaterThan(0);
    expect(result.devCode).toHaveLength(6);
    expect(emailSender.sendOtpEmail).toHaveBeenCalledTimes(1);
  });

  it('allows explicitly disabling devCode exposure in development', async () => {
    process.env.AUTH_EMAIL_DEV_CODE_VISIBLE = 'false';
    const { service } = createService();

    const result = await service.requestEmailOtp('student@example.com');

    expect(result.deliveryMode).toBe('mock');
    expect(result.devCode).toBeUndefined();
  });

  it('returns devCode in production when mock provider is explicitly allowed for demo environments', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_EMAIL_DEV_CODE_VISIBLE = 'true';
    const { service } = createService();

    const result = await service.requestEmailOtp('student@example.com');

    expect(result.deliveryMode).toBe('mock');
    expect(result.devCode).toHaveLength(6);
  });

  it('logs in with a valid email otp and creates user when needed', async () => {
    process.env.AUTH_EMAIL_DEV_CODE_VISIBLE = 'true';
    const { service, repository, jwtService } = createService();
    repository.findAccountByOpenId.mockResolvedValue(null);
    repository.createUserWithAccount.mockResolvedValue({
      id: 'user-1',
      nickname: 'CampusFit 用户',
      avatarUrl: null,
      profile: null,
    });

    const otp = await service.requestEmailOtp('student@example.com');
    const result = await service.loginWithEmailOtp('student@example.com', otp.devCode);

    expect(repository.findAccountByOpenId).toHaveBeenCalledWith('email_otp', 'student@example.com');
    expect(repository.createUserWithAccount).toHaveBeenCalled();
    expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    expect(result.accessToken).toBe('access-token');
    expect(result.user.id).toBe('user-1');
    expect(result.user.hasCompletedOnboarding).toBe(false);
  });

  it('adds a token jti to issued access and refresh tokens', async () => {
    process.env.AUTH_EMAIL_DEV_CODE_VISIBLE = 'true';
    const { service, repository, jwtService } = createService();
    repository.findAccountByOpenId.mockResolvedValue({
      user: {
        id: 'user-1',
        nickname: 'CampusFit 用户',
        avatarUrl: null,
        profile: {
          onboardingCompletedAt: new Date('2026-05-05T00:00:00.000Z'),
        },
      },
    });

    const otp = await service.requestEmailOtp('student@example.com');
    await service.loginWithEmailOtp('student@example.com', otp.devCode);

    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sub: 'user-1',
        jti: expect.any(String),
      }),
      expect.objectContaining({ expiresIn: '7d' }),
    );
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        sub: 'user-1',
        type: 'refresh',
        jti: expect.any(String),
      }),
      expect.objectContaining({ expiresIn: '30d' }),
    );
  });

  it('preserves onboarding incomplete status for existing email accounts without a profile', async () => {
    process.env.AUTH_EMAIL_DEV_CODE_VISIBLE = 'true';
    const { service, repository } = createService();
    repository.findAccountByOpenId.mockResolvedValue({
      user: {
        id: 'user-2',
        nickname: 'CampusFit 用户',
        avatarUrl: null,
        profile: null,
      },
    });

    const otp = await service.requestEmailOtp('existing@example.com');
    const result = await service.loginWithEmailOtp('existing@example.com', otp.devCode);

    expect(repository.createUserWithAccount).not.toHaveBeenCalled();
    expect(result.user.hasCompletedOnboarding).toBe(false);
  });

  it('keeps existing onboarding-complete email accounts marked as complete', async () => {
    process.env.AUTH_EMAIL_DEV_CODE_VISIBLE = 'true';
    const { service, repository } = createService();
    repository.findAccountByOpenId.mockResolvedValue({
      user: {
        id: 'user-3',
        nickname: 'CampusFit 用户',
        avatarUrl: null,
        profile: {
          onboardingCompletedAt: new Date('2026-05-05T00:00:00.000Z'),
        },
      },
    });

    const otp = await service.requestEmailOtp('complete@example.com');
    const result = await service.loginWithEmailOtp('complete@example.com', otp.devCode);

    expect(repository.createUserWithAccount).not.toHaveBeenCalled();
    expect(result.user.hasCompletedOnboarding).toBe(true);
  });

  it('rejects repeated otp requests during cooldown', async () => {
    const { service } = createService();

    await service.requestEmailOtp('student@example.com');
    await expect(service.requestEmailOtp('student@example.com')).rejects.toBeInstanceOf(AppException);
  });

  it('blocks login after too many wrong attempts', async () => {
    process.env.AUTH_EMAIL_DEV_CODE_VISIBLE = 'true';
    const { service } = createService();

    const otp = await service.requestEmailOtp('student@example.com');
    expect(otp.devCode).toHaveLength(6);

    for (let index = 0; index < 4; index += 1) {
      await expect(service.loginWithEmailOtp('student@example.com', '000000')).rejects.toBeInstanceOf(AppException);
    }

    await expect(service.loginWithEmailOtp('student@example.com', '000000')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('refreshes a normal user session from a valid refresh token', async () => {
    const { service, repository, jwtService } = createService();
    repository.findUserById.mockResolvedValue({
      id: 'user-1',
      nickname: 'CampusFit 用户',
      avatarUrl: null,
      profile: {
        onboardingCompletedAt: new Date('2026-05-04T00:00:00.000Z'),
      },
    });
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      type: 'refresh',
    });

    const session = await service.refreshSession('refresh-token');

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('refresh-token');
    expect(repository.findUserById).toHaveBeenCalledWith('user-1');
    expect(session.accessToken).toBe('access-token');
    expect(session.refreshToken).toBe('refresh-token');
    expect(session.user.hasCompletedOnboarding).toBe(true);
  });

  it('rejects refresh tokens with the wrong type', async () => {
    const { service, jwtService } = createService();
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      type: 'access',
    });

    await expect(service.refreshSession('wrong-token')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('revokes presented access and refresh tokens during logout', async () => {
    const { service, repository } = createService();

    await expect(
      service.logout({
        authorization: 'Bearer access-token',
        cookie: 'campusfit_refresh_token=refresh-token',
      }),
    ).resolves.toEqual({ success: true });

    expect(repository.createRevokedToken).toHaveBeenCalledTimes(2);
    expect(repository.createRevokedToken).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tokenId: 'access-jti',
        subject: 'user-1',
        tokenType: 'access',
      }),
    );
    expect(repository.createRevokedToken).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tokenId: 'refresh-jti',
        subject: 'user-1',
        tokenType: 'refresh',
      }),
    );
  });
});
