import { Module } from '@nestjs/common';
import { InterviewsService } from './interviews.service.js';
import { InterviewsController } from './interviews.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [InterviewsController],
  providers: [InterviewsService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
