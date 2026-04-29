const path = require('path');
const { AppException } = require(path.join(__dirname, '../../common/utils/app.exception.ts'));
const { AuthService } = require(path.join(__dirname, 'auth.service.ts'));

describe('AuthService', () => {
  const previousEnv = { ...process.env };

  beforeEach(() => {
    process.env.AUTH_EMAIL_PROVIDER = 'mock';
    process.env.AUTH_OTP_COOLDOWN_SECONDS = '60';
    process.env.AUTH_OTP_MAX_ATTEMPTS = '5';
    process.env.AUTH_OTP_TTL_SECONDS = '600';
  });

  afterEach(() => {
    process.env = { ...previousEnv };
  });

  function createService() {
    const repository = {
      findAccountByOpenId: jest.fn(),
      createUserWithAccount: jest.fn(),
    };
    const jwtService = {
      signAsync: jest.fn().mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token'),
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

  it('issues a development otp code for email login', async () => {
    const { service, emailSender } = createService();

    const result = await service.requestEmailOtp('student@example.com');

    expect(result.channel).toBe('email');
    expect(result.deliveryMode).toBe('mock');
    expect(result.expiresInSeconds).toBeGreaterThan(0);
    expect(result.devCode).toHaveLength(6);
    expect(emailSender.sendOtpEmail).toHaveBeenCalledTimes(1);
  });

  it('still returns devCode in production when mock provider is active', async () => {
    process.env.NODE_ENV = 'production';
    const { service } = createService();

    const result = await service.requestEmailOtp('student@example.com');

    expect(result.deliveryMode).toBe('mock');
    expect(result.devCode).toHaveLength(6);
  });

  it('logs in with a valid email otp and creates user when needed', async () => {
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
  });

  it('rejects repeated otp requests during cooldown', async () => {
    const { service } = createService();

    await service.requestEmailOtp('student@example.com');
    await expect(service.requestEmailOtp('student@example.com')).rejects.toBeInstanceOf(AppException);
  });

  it('blocks login after too many wrong attempts', async () => {
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
});
