import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { generateCsrfToken } from '../../common/security/csrf.util';
import type { CurrentUserPayload } from '../../common/types/request-with-user';
import { AppException } from '../../common/utils/app.exception';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { EmailLoginDto } from './dto/email-login.dto';
import { EmailRequestCodeDto } from './dto/email-request-code.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';
import {
  buildCsrfCookieHeader,
  buildSessionCookieHeaders,
  clearSessionCookieHeaders,
  extractRefreshTokenFromCookieHeader,
} from './session-cookie.util';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('email/request-code')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: '发送邮箱验证码，开发联调时仅在显式开启后返回 devCode' })
  requestCode(@Body() dto: EmailRequestCodeDto) {
    return this.authService.requestEmailOtp(dto.email);
  }

  @Public()
  @Post('email/verify-code')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: '使用邮箱验证码登录' })
  async verifyCode(@Body() dto: EmailLoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.authService.loginWithEmailOtp(dto.email, dto.code);
    const csrfToken = generateCsrfToken();
    response.setHeader('Set-Cookie', [...buildSessionCookieHeaders(session), buildCsrfCookieHeader(csrfToken)]);
    return session;
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '使用刷新令牌续期当前会话' })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = extractRefreshTokenFromCookieHeader(request.headers.cookie);
    if (!refreshToken) {
      response.setHeader('Set-Cookie', clearSessionCookieHeaders());
      throw new AppException('UNAUTHORIZED', '刷新会话已失效，请重新登录', 401);
    }

    const session = await this.authService.refreshSession(refreshToken);
    const csrfToken = generateCsrfToken();
    response.setHeader('Set-Cookie', [...buildSessionCookieHeaders(session), buildCsrfCookieHeader(csrfToken)]);
    return session;
  }

  @Public()
  @Post('wechat/login')
  @ApiOperation({ summary: '微信登录兼容接口，仅保留给历史脚本或旧客户端' })
  async login(@Body() dto: WechatLoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.authService.loginWithWechat(dto.code);
    const csrfToken = generateCsrfToken();
    response.setHeader('Set-Cookie', [...buildSessionCookieHeaders(session), buildCsrfCookieHeader(csrfToken)]);
    return session;
  }

  @Public()
  @Post('admin/login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: '管理员登录' })
  async adminLogin(@Body() dto: AdminLoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.authService.loginAdmin(dto.email, dto.password);
    const csrfToken = generateCsrfToken();
    response.setHeader('Set-Cookie', [...buildSessionCookieHeaders(session), buildCsrfCookieHeader(csrfToken)]);
    return session;
  }

  @Get('admin/me')
  @ApiOperation({ summary: '获取当前管理员会话' })
  getAdminMe(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getAdminSession(user);
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: '退出登录并清理会话 Cookie' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.authService.logout(request.headers);
    response.setHeader('Set-Cookie', clearSessionCookieHeaders());
    return { success: true };
  }
}
