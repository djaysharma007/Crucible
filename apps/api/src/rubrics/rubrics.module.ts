import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { RubricsService } from './rubrics.service.js';
import { RubricsController } from './rubrics.controller.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RubricsController],
  providers: [RubricsService],
  exports: [RubricsService],
})
export class RubricsModule {}
