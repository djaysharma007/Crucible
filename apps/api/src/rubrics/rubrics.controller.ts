import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { RubricsService } from './rubrics.service.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  CreateRubricTemplateSchema,
  UpdateRubricTemplateSchema,
  UserSummary,
} from '@crucible/shared';

@Controller()
@UseGuards(AuthGuard)
export class RubricsController {
  constructor(@Inject(RubricsService) private readonly rubricsService: RubricsService) {}

  @Get('rubrics')
  async findAll(@CurrentUser() user: UserSummary) {
    return this.rubricsService.findAll(user);
  }

  @Post('rubrics')
  async create(@CurrentUser() user: UserSummary, @Body() body: unknown) {
    const parseResult = CreateRubricTemplateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.errors[0]?.message);
    }
    return this.rubricsService.create(user, parseResult.data);
  }

  @Get('rubrics/:id')
  async findOne(@CurrentUser() user: UserSummary, @Param('id') id: string) {
    return this.rubricsService.findOne(user, id);
  }

  @Patch('rubrics/:id')
  async update(
    @CurrentUser() user: UserSummary,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parseResult = UpdateRubricTemplateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.errors[0]?.message);
    }
    return this.rubricsService.update(user, id, parseResult.data);
  }

  @Delete('rubrics/:id')
  async remove(@CurrentUser() user: UserSummary, @Param('id') id: string) {
    return this.rubricsService.remove(user, id);
  }

  @Post('rooms/:id/rubric/:rubricId')
  async attachToInterview(
    @CurrentUser() user: UserSummary,
    @Param('id') id: string,
    @Param('rubricId') rubricId: string,
  ) {
    return this.rubricsService.attachToInterview(user, id, rubricId);
  }

  @Get('rooms/:id/rubric')
  async getInterviewRubric(@Param('id') id: string) {
    return this.rubricsService.getInterviewRubric(id);
  }
}
