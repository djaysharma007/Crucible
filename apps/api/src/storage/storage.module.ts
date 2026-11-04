import { Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';
import { StorageController } from './storage.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [AuthModule, RoomsModule, RedisModule, PrismaModule],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
