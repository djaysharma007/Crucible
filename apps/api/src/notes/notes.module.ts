import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotesService } from './notes.service.js';
import { NotesController } from './notes.controller.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}
