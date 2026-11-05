import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InterviewsService } from './interviews.service.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  CreateInterviewSchema,
  UpdateInterviewSchema,
  InterviewFilterSchema,
  UserSummary,
} from '@crucible/shared';

@Controller('interviews')
@UseGuards(AuthGuard)
export class InterviewsController {
  constructor(@Inject(InterviewsService) private readonly interviewsService: InterviewsService) {}

  @Post()
  async create(@CurrentUser() user: UserSummary, @Body() body: unknown) {
    const parseResult = CreateInterviewSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.errors[0]?.message);
    }

    return this.interviewsService.create(user, parseResult.data);
  }

  @Get()
  async findAll(@CurrentUser() user: UserSummary, @Query() query: unknown) {
    const parseResult = InterviewFilterSchema.safeParse(query);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.errors[0]?.message);
    }

    return this.interviewsService.findAll(user, parseResult.data);
  }

  @Get('stats')
  async getStats(@CurrentUser() user: UserSummary) {
    return this.interviewsService.getStats(user);
  }

  @Get('compare')
  async compare(
    @CurrentUser() user: UserSummary,
    @Query('id1') id1: string,
    @Query('id2') id2: string,
  ) {
    if (!id1 || !id2) {
      throw new BadRequestException(
        'Both id1 and id2 query parameters are required for candidate comparison',
      );
    }
    return this.interviewsService.compare(user, id1, id2);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: UserSummary, @Param('id') id: string) {
    return this.interviewsService.findOne(user, id);
  }

  @Get(':id/detail')
  async getDetail(@CurrentUser() user: UserSummary, @Param('id') id: string) {
    return this.interviewsService.getDetail(user, id);
  }

  @Get(':id/replay')
  async getReplay(@CurrentUser() user: UserSummary, @Param('id') id: string) {
    return this.interviewsService.getReplay(user, id);
  }

  @Post('cleanup')
  async cleanupExpired(@Query('retentionDays') retentionDays?: string) {
    const days = retentionDays ? parseInt(retentionDays, 10) : 90;
    return this.interviewsService.cleanupExpired(isNaN(days) ? 90 : days);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: UserSummary, @Param('id') id: string) {
    return this.interviewsService.delete(user, id);
  }

  @Patch(':id')
  async update(@CurrentUser() user: UserSummary, @Param('id') id: string, @Body() body: unknown) {
    const parseResult = UpdateInterviewSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.errors[0]?.message);
    }

    return this.interviewsService.update(user, id, parseResult.data);
  }

  @Post(':id/start')
  async start(@CurrentUser() user: UserSummary, @Param('id') id: string) {
    return this.interviewsService.start(user, id);
  }

  @Post(':id/end')
  async end(@CurrentUser() user: UserSummary, @Param('id') id: string) {
    return this.interviewsService.end(user, id);
  }

  @Post(':id/cancel')
  async cancel(@CurrentUser() user: UserSummary, @Param('id') id: string) {
    return this.interviewsService.cancel(user, id);
  }

  @Post(':id/questions')
  async attachQuestion(
    @CurrentUser() user: UserSummary,
    @Param('id') id: string,
    @Body() body: { questionId: string; language?: string },
  ) {
    if (!body?.questionId) {
      throw new BadRequestException('questionId is required');
    }

    return this.interviewsService.attachQuestion(user, id, body.questionId, body.language);
  }

  @Delete(':id/questions/:iqId')
  async detachQuestion(
    @CurrentUser() user: UserSummary,
    @Param('id') id: string,
    @Param('iqId') iqId: string,
  ) {
    return this.interviewsService.detachQuestion(user, id, iqId);
  }
}
