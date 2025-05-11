import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class TokenErrorExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception.name === 'TokenError') {
      res.redirect('/auth/google');
    } else if (exception.name === 'UnauthorizedException') {
      res.redirect('/auth/error');
    } else {
      res.redirect(
        `${process.env.FRONTEND_ADDRESS}/users/login?error=${exception}`,
      );
    }
  }
}
