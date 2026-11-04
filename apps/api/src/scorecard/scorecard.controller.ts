import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ScorecardService } from './scorecard.service.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { SubmitScorecardSchema, UserSummary } from '@crucible/shared';

@Controller('rooms/:id/scorecard')
@UseGuards(AuthGuard)
export class ScorecardController {
  constructor(@Inject(ScorecardService) private readonly scorecardService: ScorecardService) {}

  @Get()
  async getScorecard(@CurrentUser() user: UserSummary, @Param('id') id: string) {
    return this.scorecardService.getScorecard(user, id);
  }

  @Post()
  async submitScorecard(
    @CurrentUser() user: UserSummary,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parseResult = SubmitScorecardSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.errors[0]?.message);
    }
    return this.scorecardService.submitScorecard(user, id, parseResult.data);
  }
}
