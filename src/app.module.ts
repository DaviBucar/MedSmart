// src/app.module.ts

import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StudyProfileModule } from './study-profile/study-profile.module';
import { SessionsModule } from './sessions/sessions.module';
import { PerformanceModule } from './performance/performance.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { ContentModule } from './content/content.module';
import { FeedbackModule } from './feedback/feedback.module';
import { DocumentsModule } from './documents/documents.module';
import { AiModule } from './ai/ai.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
    AppConfigModule, // carrega .env e disponibiliza ConfigService globalmente
    PrismaModule, // conecta ao banco via Prisma
    AuthModule, // autenticação JWT / Local
    UsersModule, // endpoints de usuários e preferências
    StudyProfileModule, // gestão de perfil de estudo
    SessionsModule, // início/final de sessões de estudo
    PerformanceModule, // grava métricas de desempenho
    RecommendationsModule, // gera planos de estudo
    ContentModule, // flashcards, quiz, mind maps
    FeedbackModule, // relatórios pós-sessão
    DocumentsModule, // upload de PDF + OCR + processamento em fila
    AiModule, // abstrações de prompt e chamadas LLM
  ],
})
export class AppModule {}
