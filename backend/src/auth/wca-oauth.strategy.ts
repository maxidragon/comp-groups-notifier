import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AuthService } from './auth.service';

@Injectable()
export class WcaOAuthStrategy extends PassportStrategy(Strategy, 'wca') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      authorizationURL: 'https://www.worldcubeassociation.org/oauth/authorize',
      tokenURL: 'https://www.worldcubeassociation.org/oauth/token',
      clientID: configService.get<string>('WCA_CLIENT_ID'),
      clientSecret: configService.get<string>('WCA_CLIENT_SECRET'),
      callbackURL: configService.get<string>('WCA_CALLBACK_URL'),
      scope: ['public', 'manage_competitions'],
    });
  }

  async validate(accessToken: string): Promise<any> {
    // Fetch WCA user profile
    const { data } = await axios.get(
      'https://www.worldcubeassociation.org/api/v0/me',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const wcaUser = data.me;

    const user = await this.authService.findOrCreateUser({
      wcaUserId: wcaUser.id,
      fullName: wcaUser.name,
      avatarUrl: wcaUser.avatar?.thumb_url || wcaUser.avatar?.url,
      wcaAccessToken: accessToken,
    });

    return user;
  }
}
