import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { ExecutionController } from './execution.controller.js';
import { ExecutionService } from './execution.service.js';
import { EXECUTION_PROVIDER } from './execution-provider.interface.js';
import { SelfHostedJudge0Provider } from './self-hosted-judge0.provider.js';
import { RapidApiJudge0Provider } from './rapidapi-judge0.provider.js';

@Module({
  imports: [PrismaModule, AuthModule, RoomsModule],
  controllers: [ExecutionController],
  providers: [
    SelfHostedJudge0Provider,
    RapidApiJudge0Provider,
    {
      provide: EXECUTION_PROVIDER,
      useFactory: (selfHosted: SelfHostedJudge0Provider, rapidApi: RapidApiJudge0Provider) => {
        const providerName = (process.env.EXECUTION_PROVIDER || 'self_hosted').toLowerCase();
        if (providerName === 'rapidapi') {
          return rapidApi;
        }
        return selfHosted;
      },
      inject: [SelfHostedJudge0Provider, RapidApiJudge0Provider],
    },
    ExecutionService,
  ],
  exports: [ExecutionService, EXECUTION_PROVIDER],
})
export class ExecutionModule {}
