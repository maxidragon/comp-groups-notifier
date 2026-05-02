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
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    // Redirect to frontend with JWT in query param (frontend stores it in localStorage)
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
