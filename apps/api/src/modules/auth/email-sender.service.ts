import { Injectable, Logger } from '@nestjs/common';
const nodemailer = require('nodemailer');
import { AppException } from '../../common/utils/app.exception';

export type SendOtpEmailPayload = {
  email: string;
  code: string;
  ttlSeconds: number;
};

@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);

  get provider() {
    return process.env.AUTH_EMAIL_PROVIDER?.trim().toLowerCase() || 'mock';
  }

  isMockProvider() {
    return this.provider === 'mock';
  }

  describe() {
    if (this.provider === 'mock') {
      return {
        provider: 'mock',
        ready: true,
        issue: null,
      };
    }

    if (this.provider === 'smtp') {
      const missing = this.getMissingSmtpConfig();
      return {
        provider: 'smtp',
        ready: missing.length === 0,
        issue: missing.length === 0 ? null : `缺少 SMTP 配置：${missing.join(', ')}`,
      };
    }

    return {
      provider: this.provider,
      ready: false,
      issue: `未支持的邮件提供方：${this.provider}`,
    };
  }

  async sendOtpEmail(payload: SendOtpEmailPayload) {
    switch (this.provider) {
      case 'mock':
        this.logger.log(`开发模式验证码：${payload.email} -> ${payload.code}`);
        return;
      case 'smtp':
        await this.sendBySmtp(payload);
        return;
      default:
        throw new AppException('INTERNAL_ERROR', `未支持的邮件提供方：${this.provider}`, 500);
    }
  }

  private getMissingSmtpConfig() {
    const required = [
      ['SMTP_HOST', process.env.SMTP_HOST],
      ['SMTP_USER', process.env.SMTP_USER],
      ['SMTP_PASSWORD', process.env.SMTP_PASSWORD],
      ['SMTP_FROM', process.env.SMTP_FROM],
    ];

    return required.filter(([, value]) => !value).map(([name]) => name);
  }

  private async sendBySmtp(payload: SendOtpEmailPayload) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || '465');
    const secure = (process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM;
    const missing = this.getMissingSmtpConfig();

    if (missing.length > 0) {
      throw new AppException('INTERNAL_ERROR', `SMTP 配置不完整：${missing.join(', ')}`, 500);
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    try {
      await transporter.sendMail({
        from,
        to: payload.email,
        subject: 'CampusFit AI 登录验证码',
        text: [
          '你正在登录 CampusFit AI。',
          `验证码：${payload.code}`,
          `有效期：${Math.ceil(payload.ttlSeconds / 60)} 分钟。`,
          '如果这不是你的操作，请忽略这封邮件。',
        ].join('\n'),
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.7;color:#163226;max-width:560px;margin:0 auto;padding:24px">
            <h2 style="margin:0 0 16px">CampusFit AI 登录验证码</h2>
            <p>你正在登录 CampusFit AI。</p>
            <p style="font-size:28px;font-weight:700;letter-spacing:0.32em;margin:20px 0;color:#163226">${payload.code}</p>
            <p>验证码有效期约 ${Math.ceil(payload.ttlSeconds / 60)} 分钟。</p>
            <p>如果这不是你的操作，请忽略这封邮件。</p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`验证码邮件发送失败：${error instanceof Error ? error.message : 'unknown error'}`);
      throw new AppException('EMAIL_SEND_FAILED', '验证码邮件发送失败，请稍后重试', 502);
    }
  }
}
