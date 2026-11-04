import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { AuthModule } from './auth/auth.module.js';
import { InterviewsModule } from './interviews/interviews.module.js';
import { RoomsModule } from './rooms/rooms.module.js';

@Module({
  imports: [PrismaModule, RedisModule, HealthModule, AuthModule, InterviewsModule, RoomsModule],
})
export class AppModule {}
