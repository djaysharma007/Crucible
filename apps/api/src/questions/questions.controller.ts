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
import { QuestionsService, QuestionFilters } from './questions.service.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  CreateQuestionSchema,
  UpdateQuestionSchema,
  UserSummary,
  QuestionDifficulty,
} from '@crucible/shared';

@Controller('questions')
@UseGuards(AuthGuard)
export class QuestionsController {
  constructor(@Inject(QuestionsService) private readonly questionsService: QuestionsService) {}

  @Post()
  async create(@CurrentUser() user: UserSummary, @Body() body: unknown) {
    const parseResult = CreateQuestionSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.errors[0]?.message);
    }
    return this.questionsService.create(user, parseResult.data);
  }

  @Get()
  async findAll(
    @CurrentUser() user: UserSummary,
    @Query('search') search?: string,
    @Query('difficulty') difficulty?: string,
    @Query('tag') tag?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    const filters: QuestionFilters = {
      search: search || undefined,
      difficulty: difficulty ? (difficulty as QuestionDifficulty) : undefined,
      tag: tag || undefined,
      includeArchived: includeArchived === 'true',
    };
    return this.questionsService.findAll(user, filters);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: UserSummary, @Param('id') id: string) {
    return this.questionsService.findOne(user, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: UserSummary,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parseResult = UpdateQuestionSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.errors[0]?.message);
    }
    return this.questionsService.update(user, id, parseResult.data);
  }

  @Delete(':id')
  async archive(@CurrentUser() user: UserSummary, @Param('id') id: string) {
    return this.questionsService.archive(user, id);
  }

  @Post(':id/duplicate')
  async duplicate(@CurrentUser() user: UserSummary, @Param('id') id: string) {
    return this.questionsService.duplicate(user, id);
  }

  @Get(':id/export')
  async exportJson(@CurrentUser() user: UserSummary, @Param('id') id: string) {
    return this.questionsService.exportJson(user, id);
  }

  @Post('import')
  async importJson(@CurrentUser() user: UserSummary, @Body() body: unknown) {
    return this.questionsService.importJson(user, body);
  }

  @Post('seed')
  async seedDefaults(@CurrentUser() user: UserSummary) {
    return this.questionsService.seedDefaults(user);
  }
}
