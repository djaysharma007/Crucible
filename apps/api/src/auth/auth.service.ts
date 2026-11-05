import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { BrevoEmailService } from './brevo-email.service.js';
import {
  RegisterInput,
  LoginInput,
  PasswordResetRequestInput,
  PasswordResetConfirmInput,
  UserSummary,
} from '@crucible/shared';

export interface SessionJwtPayload {
  sub: string;
  email: string;
  displayName: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly sessionSecret =
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    'dev_session_secret_change_in_production_min_32_chars';

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(BrevoEmailService) private readonly emailService: BrevoEmailService,
  ) {}

  async register(input: RegisterInput): Promise<{ user: UserSummary; token: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        displayName: input.displayName,
      },
    });

    const userSummary: UserSummary = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
    };

    const token = this.generateSessionToken(userSummary);
    this.logger.log(`User registered: ${user.email} (${user.id})`);

    return { user: userSummary, token };
  }

  async login(input: LoginInput): Promise<{ user: UserSummary; token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await argon2.verify(user.passwordHash, input.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const userSummary: UserSummary = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
    };

    const token = this.generateSessionToken(userSummary);
    this.logger.log(`User logged in: ${user.email} (${user.id})`);

    return { user: userSummary, token };
  }

  async validateSession(token: string): Promise<UserSummary | null> {
    try {
      const decoded = jwt.verify(token, this.sessionSecret) as SessionJwtPayload;
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
      });

      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt.toISOString(),
      };
    } catch {
      return null;
    }
  }

  async forgotPassword(input: PasswordResetRequestInput): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (user) {
      const resetToken = randomBytes(32).toString('hex');
      // Token expires in 1 hour (3600s)
      await this.redis.set(`reset_token:${resetToken}`, user.id, 3600);
      this.logger.log(`Password reset token generated for ${user.email}: ${resetToken}`);
      await this.emailService.sendPasswordResetEmail(user.email, resetToken);
    }

    return {
      message: 'If an account exists with this email, instructions have been sent.',
    };
  }

  async resetPassword(input: PasswordResetConfirmInput): Promise<{ message: string }> {
    const userId = await this.redis.get(`reset_token:${input.token}`);
    if (!userId) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const passwordHash = await argon2.hash(input.newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.redis.del(`reset_token:${input.token}`);
    this.logger.log(`Password reset completed for user ${userId}`);

    return { message: 'Password has been reset successfully' };
  }

  private generateSessionToken(user: UserSummary): string {
    const payload: SessionJwtPayload = {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
    };

    return jwt.sign(payload, this.sessionSecret, { expiresIn: '7d' });
  }
}
