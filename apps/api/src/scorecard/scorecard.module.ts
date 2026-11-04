import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ScorecardService } from './scorecard.service.js';
import { ScorecardController } from './scorecard.controller.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ScorecardController],
  providers: [ScorecardService],
  exports: [ScorecardService],
})
export class ScorecardModule {}
