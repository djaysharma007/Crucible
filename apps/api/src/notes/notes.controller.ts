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
import { NotesService } from './notes.service.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CreateNoteSchema, UpdateNoteSchema, UserSummary } from '@crucible/shared';

@Controller('rooms/:id/notes')
@UseGuards(AuthGuard)
export class NotesController {
  constructor(@Inject(NotesService) private readonly notesService: NotesService) {}

  @Get()
  async getNotes(@CurrentUser() user: UserSummary, @Param('id') id: string) {
    return this.notesService.getNotes(user, id);
  }

  @Post()
  async createNote(
    @CurrentUser() user: UserSummary,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parseResult = CreateNoteSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.errors[0]?.message);
    }
    return this.notesService.createNote(user, id, parseResult.data);
  }

  @Patch(':noteId')
  async updateNote(
    @CurrentUser() user: UserSummary,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @Body() body: unknown,
  ) {
    const parseResult = UpdateNoteSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.errors[0]?.message);
    }
    return this.notesService.updateNote(user, id, noteId, parseResult.data);
  }

  @Delete(':noteId')
  async deleteNote(
    @CurrentUser() user: UserSummary,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
  ) {
    return this.notesService.deleteNote(user, id, noteId);
  }
}
