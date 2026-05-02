import { Controller, Get, Req, Res, UseGuards, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('login')
  @UseGuards(AuthGuard('wca'))
  login() {
    // Passport redirects to WCA OAuth
  }

  @Get('callback')
  @UseGuards(AuthGuard('wca'))
  async callback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    console.log(user);
    const token = this.authService.generateJwt(user);

    // Prefer the explicit FRONTEND_URL env var.
    // Fall back to deriving origin from Nginx-forwarded headers so this works
    // in production without extra config: Nginx sets Host=$host and
    // X-Forwarded-Proto=$scheme, giving us the correct https:// origin.
    const configuredUrl = this.configService.get<string>('FRONTEND_URL');
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = req.get('host'); // 'cgn.maksymiliangala.com' via Nginx Host header
    const frontendUrl = configuredUrl || `${proto}://${host}`;

    return res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async getMe(@Req() req: Request) {
    const user = req.user as any;
    return this.authService.getMe(user.id);
  }
}
