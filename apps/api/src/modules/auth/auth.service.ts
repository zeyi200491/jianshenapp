import { createHash, randomInt } from 'crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppException } from '../../common/utils/app.exception';
import { getAdminCredentials } from '../../config/security.config';
import { AuthRepository } from './auth.repository';
import { EmailSenderService } from './email-sender.service';

type OtpRecord = {
  code: string;
  expiresAt: number;
  cooldownUntil: number;
  failedAttempts: number;
};

@Injectable()
export class AuthService {
  private readonly otpTtlSeconds = Number(process.env.AUTH_OTP_TTL_SECONDS || '600');
  private readonly otpCooldownSeconds = Number(process.env.AUTH_OTP_COOLDOWN_SECONDS || '60');
  private readonly otpMaxAttempts = Number(process.env.AUTH_OTP_MAX_ATTEMPTS || '5');
  private readonly otpStore = new Map<string, OtpRecord>();

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly emailSender: EmailSenderService,
  ) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private buildMockWechatIdentity(code: string) {
    const openId = createHash('sha256').update(`wechat:${code}`).digest('hex');
    const unionId = createHash('sha256').update(`union:${code}`).digest('hex').slice(0, 32);
    const sessionKeyDigest = createHash('sha256').update(`session:${code}`).digest('hex');

    return {
      provider: 'wechat_miniapp',
      openId,
      unionId,
      sessionKeyDigest,
    };
  }

  private buildEmailIdentity(email: string, code: string) {
    return {
      provider: 'email_otp',
      openId: this.normalizeEmail(email),
      unionId: null,
      sessionKeyDigest: createHash('sha256')
        .update(`email:${this.normalizeEmail(email)}:${code}`)
        .digest('hex'),
    };
  }

  private async buildLoginPayload(user: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
    profile?: { onboardingCompletedAt?: Date | null } | null;
  }) {
    const accessToken = await this.jwtService.signAsync({ sub: user.id }, { expiresIn: '7d' });
    const refreshToken = await this.jwtService.signAsync({ sub: user.id, type: 'refresh' }, { expiresIn: '30d' });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        hasCompletedOnboarding: Boolean(user.profile?.onboardingCompletedAt),
      },
    };
  }

  private async buildAdminLoginPayload(email: string) {
    const accessToken = await this.jwtService.signAsync(
      { sub: `admin:${email}`, role: 'operator', type: 'admin' },
      { expiresIn: '12h' },
    );
    const refreshToken = await this.jwtService.signAsync(
      { sub: `admin:${email}`, role: 'operator', type: 'admin-refresh' },
      { expiresIn: '30d' },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: `admin:${email}`,
        name: email.split('@')[0],
        role: 'operator',
      },
    };
  }

  private generateOtpCode() {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private resolveDevCode(code: string) {
    const visible = (process.env.AUTH_EMAIL_DEV_CODE_VISIBLE || '').toLowerCase();
    if (this.emailSender.isMockProvider()) {
      return code;
    }
    if (process.env.NODE_ENV !== 'production' && visible === 'true') {
      return code;
    }
    return undefined;
  }

  private buildMaskedDestination(email: string) {
    const [name, domain] = email.split('@');
    const maskedName = name.length <= 2 ? `${name[0] ?? '*'}*` : `${name.slice(0, 2)}***`;
    return `${maskedName}@${domain}`;
  }

  async requestEmailOtp(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const now = Date.now();
    const existing = this.otpStore.get(normalizedEmail);

    if (existing && existing.cooldownUntil > now) {
      const retryAfter = Math.max(1, Math.ceil((existing.cooldownUntil - now) / 1000));
      throw new AppException('TOO_MANY_REQUESTS', `验证码发送过于频繁，请在 ${retryAfter} 秒后重试`, 429);
    }

    const code = this.generateOtpCode();
    this.otpStore.set(normalizedEmail, {
      code,
      expiresAt: now + this.otpTtlSeconds * 1000,
      cooldownUntil: now + this.otpCooldownSeconds * 1000,
      failedAttempts: 0,
    });

    await this.emailSender.sendOtpEmail({
      email: normalizedEmail,
      code,
      ttlSeconds: this.otpTtlSeconds,
    });

    const delivery = this.emailSender.describe();

    return {
      channel: 'email',
      destination: this.buildMaskedDestination(normalizedEmail),
      expiresInSeconds: this.otpTtlSeconds,
      deliveryMode: delivery.provider,
      devCode: this.resolveDevCode(code),
    };
  }

  async loginWithEmailOtp(email: string, code: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const record = this.otpStore.get(normalizedEmail);

    if (!record || record.expiresAt < Date.now()) {
      this.otpStore.delete(normalizedEmail);
      throw new AppException('UNAUTHORIZED', '验证码错误或已过期', 401);
    }

    if (record.code !== code) {
      record.failedAttempts += 1;
      if (record.failedAttempts >= this.otpMaxAttempts) {
        this.otpStore.delete(normalizedEmail);
        throw new AppException('UNAUTHORIZED', '验证码错误次数过多，请重新获取验证码', 401);
      }
      this.otpStore.set(normalizedEmail, record);
      throw new AppException('UNAUTHORIZED', '验证码错误或已过期', 401);
    }

    this.otpStore.delete(normalizedEmail);

    const identity = this.buildEmailIdentity(normalizedEmail, code);
    const existing = await this.authRepository.findAccountByOpenId(identity.provider, identity.openId);
    const user = existing?.user ?? (await this.authRepository.createUserWithAccount(identity));

    return this.buildLoginPayload(user);
  }

  async loginWithWechat(code: string) {
    const identity = this.buildMockWechatIdentity(code);
    const existing = await this.authRepository.findAccountByOpenId(identity.provider, identity.openId);
    const user = existing?.user ?? (await this.authRepository.createUserWithAccount(identity));

    return this.buildLoginPayload(user);
  }

  async loginAdmin(email: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const credentials = getAdminCredentials();

    if (normalizedEmail !== this.normalizeEmail(credentials.email) || password !== credentials.password) {
      throw new AppException('UNAUTHORIZED', '管理员账号或密码错误', 401);
    }

    return this.buildAdminLoginPayload(normalizedEmail);
  }

  getAdminSession(user: { userId: string; role?: string; tokenType?: string }) {
    if (user.role !== 'operator' || user.tokenType !== 'admin') {
      throw new AppException('FORBIDDEN', '当前账号没有后台访问权限', 403);
    }

    const email = user.userId.replace(/^admin:/, '');
    return {
      id: user.userId,
      name: email.split('@')[0],
      role: 'operator',
    };
  }
}
