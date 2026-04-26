import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { CurrentUserPayload } from '../../common/types/request-with-user';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { EmailLoginDto } from './dto/email-login.dto';
import { EmailRequestCodeDto } from './dto/email-request-code.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { buildSessionCookieHeaders, clearSessionCookieHeaders } from './session-cookie.util';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('email/request-code')
  @ApiOperation({ summary: '发送邮箱验证码，开发模式下可能返回 devCode 便于联调' })
  requestCode(@Body() dto: EmailRequestCodeDto) {
    return this.authService.requestEmailOtp(dto.email);
  }

  @Public()
  @Post('email/verify-code')
  @ApiOperation({ summary: '使用邮箱验证码登录' })
  async verifyCode(@Body() dto: EmailLoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.authService.loginWithEmailOtp(dto.email, dto.code);
    response.setHeader('Set-Cookie', buildSessionCookieHeaders(session));
    return session;
  }

  @Public()
  @Post('wechat/login')
  @ApiOperation({ summary: '微信登录兼容接口，仅保留给历史脚本或旧客户端' })
  async login(@Body() dto: WechatLoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.authService.loginWithWechat(dto.code);
    response.setHeader('Set-Cookie', buildSessionCookieHeaders(session));
    return session;
  }

  @Public()
  @Post('admin/login')
  @ApiOperation({ summary: '管理员登录' })
  async adminLogin(@Body() dto: AdminLoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.authService.loginAdmin(dto.email, dto.password);
    response.setHeader('Set-Cookie', buildSessionCookieHeaders(session));
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
  logout(@Res({ passthrough: true }) response: Response) {
    response.setHeader('Set-Cookie', clearSessionCookieHeaders());
    return { success: true };
  }
}
