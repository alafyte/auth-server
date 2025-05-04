import { User } from '../../user/user.entity';

export interface UserJwtPayload {
  id: string;
  role: string;
  email: string;
  group: string | undefined;
}

export interface JwtPayload {
  [key: string]: string;
}

export interface GoogleAuthPayload {
  googleAccessToken: string;
  googleRefreshToken: string;
  currentUser: User;
}

export interface GoogleAuthPayloadRequest extends Request {
  user: GoogleAuthPayload;
}