import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Auth } from 'googleapis';
import { JwtPayload } from './interfaces/user-payload.interface';
import { AuthServiceException } from './exceptions/auth-service.exception';
import { errorMessages } from '../i18n/error-messages';

@Injectable()
export class AuthService {
  private oauth2Client: Auth.OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.oauth2Client = new Auth.OAuth2Client(
      this.configService.getOrThrow('GOOGLE_CLIENT_ID'),
      this.configService.getOrThrow('GOOGLE_CLIENT_SECRET'),
      this.configService.getOrThrow('GOOGLE_CALLBACK_URL'),
    );
  }

  public async refreshGoogleToken(refreshToken: string) {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      Logger.error(error);
      throw new AuthServiceException(errorMessages.ERROR_GOOGLE_TOKEN_REFRESH());
    }
  }

  public async verifyToken<T extends object>(token: string, secret: string): Promise<T> {
    try {
      return await this.jwtService.verifyAsync<T>(token, { secret });
    } catch (e) {
      Logger.error(e);
      throw new AuthServiceException(errorMessages.ERROR_TOKEN_VALIDATION());
    }
  }

  public async generateToken(
    payload: JwtPayload,
    secret: string,
    expiresIn: string,
  ): Promise<string> {
    try {
      return await this.jwtService.signAsync(payload, {
        secret,
        expiresIn,
      });
    } catch (error) {
      Logger.error(error);
      throw new AuthServiceException(errorMessages.ERROR_TOKEN_GENERATION());
    }
  }
}
