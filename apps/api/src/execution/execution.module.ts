import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service.js';
import { ExecutionController } from './execution.controller.js';
import { Judge0Client } from './judge0.client.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { RoomsModule } from '../rooms/rooms.module.js';

@Module({
  imports: [PrismaModule, AuthModule, RoomsModule],
  providers: [ExecutionService, Judge0Client],
  controllers: [ExecutionController],
  exports: [ExecutionService, Judge0Client],
})
export class ExecutionModule {}

