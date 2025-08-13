import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { SessionsModule } from './sessions/sessions.module';
import { AiModule } from './ai/ai.module';
import { FlashcardsModule } from './flashcards/flashcards.module';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuração global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Módulos da aplicação
    PrismaModule,
    AuthModule,
    DocumentsModule,
    SessionsModule,
    AiModule,
    FlashcardsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
