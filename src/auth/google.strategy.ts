import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'https://www.googleapis.com/auth/calendar.events'],
    });
  }


  authorizationParams(): { [key: string]: string; } {
    return ({
      access_type: 'offline',
      prompt: 'consent',
    });
  }

  public async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails ? profile.emails[0].value : undefined;

    if (!email) {
      return done('Email не найден');
    }

    const currentUser = await this.userService.findOneByEmail(email);

    if (!currentUser) {
      return done('Пользователь не найден');
    }
    if (!currentUser.is_active) {
      return done('Пользователь не активен');
    }

    return done(null, {
      googleAccessToken: accessToken,
      googleRefreshToken: refreshToken,
      currentUser
    });
  }
}