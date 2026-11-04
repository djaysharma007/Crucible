import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { AuthModule } from './auth/auth.module.js';
import { InterviewsModule } from './interviews/interviews.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { QuestionsModule } from './questions/questions.module.js';
import { ExecutionModule } from './execution/execution.module.js';
import { PresenceModule } from './presence/presence.module.js';
import { RubricsModule } from './rubrics/rubrics.module.js';
import { NotesModule } from './notes/notes.module.js';
import { ScorecardModule } from './scorecard/scorecard.module.js';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    InterviewsModule,
    RoomsModule,
    QuestionsModule,
    ExecutionModule,
    PresenceModule,
    RubricsModule,
    NotesModule,
    ScorecardModule,
  ],
})
export class AppModule {}
