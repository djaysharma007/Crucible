import { Module } from '@nestjs/common';
import { PresenceService } from './presence.service.js';
import { PresenceController } from './presence.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { RoomsModule } from '../rooms/rooms.module.js';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule, RoomsModule],
  providers: [PresenceService],
  controllers: [PresenceController],
  exports: [PresenceService],
})
export class PresenceModule {}

