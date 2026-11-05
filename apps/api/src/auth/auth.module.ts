import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './guards/auth.guard.js';
import { BrevoEmailService } from './brevo-email.service.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, BrevoEmailService],
  exports: [AuthService, AuthGuard, BrevoEmailService],
})
export class AuthModule {}
