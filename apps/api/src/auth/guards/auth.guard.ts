import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const sessionToken = request.cookies?.['crucible_session'];

    if (!sessionToken) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.authService.validateSession(sessionToken);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    (request as unknown as { user: unknown }).user = user;
    return true;
  }
}
