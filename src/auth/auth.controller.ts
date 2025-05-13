import {
  Controller,
  Get, Inject, Logger,
  Query,
  Redirect,
  Req,
  Headers,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleOAuthGuard } from './google-oauth.guard';
import { GoogleAuthPayloadRequest, UserJwtPayload } from './interfaces/user-payload.interface';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { TokenErrorExceptionFilter } from './auth-exception.filter';
import { ClientKafka, EventPattern } from '@nestjs/microservices';
import { verificationEmail } from '../templates/email-templates';
import { VerificationEventOptions } from './interfaces/verification-event-options.interface';
import { EmailOptions } from './interfaces/email-options.interface';
import { AuthServiceExceptionFilter } from './exceptions/auth-service-exception.filter';
import { AuthServiceException } from './exceptions/auth-service.exception';

@Controller('auth')
export class AuthController {
  private readonly FRONTEND_ADDRESS: string;
  private readonly SENDER: string;

  constructor(
    @Inject('AUTH_SERVICE') private client: ClientKafka,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly configService: ConfigService) {
    this.FRONTEND_ADDRESS = this.configService.getOrThrow<string>('FRONTEND_ADDRESS');
    this.SENDER = this.configService.getOrThrow<string>('PLATFORM_SENDER');
  }

  @EventPattern('verification-token')
  public async createVerificationToken(options: VerificationEventOptions) {
    try {
      const token = await this.authService.generateToken(
        {
          id: (options.user as any).ID,
          email: options.user.email,
          role: (options.user as any).role_id,
          group: (options.user as any).group_ID,
        },
        this.configService.getOrThrow<string>('JWT_SECRET_KEY'),
        this.configService.getOrThrow<string>('JWT_TOKEN_LIFETIME'),
      );

      const userEmail = options.user.email;
      const subject = 'Подтверждение адреса электронной почты';
      const text = verificationEmail({
        firstName: options.user.first_name,
        patronymic: options.user.patronymic,
        token,
        serverAddress: this.configService.getOrThrow<string>('AUTH_SERVER_ADDRESS'),
      });

      const eventOptions: EmailOptions = {
        sender: this.SENDER,
        to: userEmail,
        subject,
        text,
      };

      this.client.emit('send-email', eventOptions);
    } catch (error) {
      if (error instanceof AuthServiceException) {
        Logger.error('Token generation failed:', error.message);
      } else {
        Logger.error('Unexpected error occurred:', error);
      }
    }
  }

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  public async login() {
  }

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @UseFilters(TokenErrorExceptionFilter)
  @Redirect()
  public async googleAuthRedirect(
    @Req() req: GoogleAuthPayloadRequest,
  ) {
    try {
      const { googleAccessToken, googleRefreshToken, currentUser } = req.user;

      const accessToken = await this.authService.generateToken(
        {
          id: currentUser.id,
          role: currentUser.role.name,
          group: currentUser.group?.id
        },
        this.configService.getOrThrow<string>('ACCESS_TOKEN_SECRET_KEY'),
        this.configService.getOrThrow<string>('ACCESS_TOKEN_LIFETIME'),
      );

      const jwtToken = await this.authService.generateToken(
        {
          accessToken,
          googleAccessToken,
          googleRefreshToken,
        },
        this.configService.getOrThrow<string>('JWT_SECRET_KEY'),
        this.configService.getOrThrow<string>('JWT_TOKEN_LIFETIME'),
      );

      return { url: `${this.FRONTEND_ADDRESS}/auth/success?token=${jwtToken}` };
    } catch (err) {
      return { url: '/auth/error' };
    }
  }

  @Get('error')
  @Redirect()
  async authError() {
    return { url: `${this.FRONTEND_ADDRESS}/users/login?error=Произошла ошибка при входе в систему` };
  }

  @Get('refresh-token')
  @UseFilters(AuthServiceExceptionFilter)
  async refreshToken(@Headers('x-google-refresh-token') refreshToken: string) {
    const newTokens = await this.authService.refreshGoogleToken(refreshToken);
    return {
      newAccessToken: newTokens.access_token,
      newRefreshToken: newTokens.refresh_token,
    };
  }

  @Get('email/verify')
  @Redirect()
  async verifyEmailToken(@Query('token') token: string) {
    try {
    const user = await this.authService.verifyToken<UserJwtPayload>(token, this.configService.getOrThrow<string>('JWT_SECRET_KEY'));
      const result = await this.userService.updateUser(user.id, {
        is_active: true,
        activated: true,
        email: user.email,
      });

      if (!result) {
        throw new Error('Failed to update user');
      }

      return { url: `${this.FRONTEND_ADDRESS}/auth/verify` };
    } catch (error) {
      return {
        url:
          `${this.FRONTEND_ADDRESS}/auth/verify?error=Токен не валиден. Запросите новый токен у своего администратора.`,
      };
    }
  }

  @Get('token/verify')
  @UseFilters(AuthServiceExceptionFilter)
  async verifyToken(@Query('token') token: string) {
    return this.authService.verifyToken<UserJwtPayload>(token, this.configService.getOrThrow<string>('ACCESS_TOKEN_SECRET_KEY'));
  }
}
