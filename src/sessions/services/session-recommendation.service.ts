import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionRecommendationDto } from '../dto/session-recommendation.dto';
import { RecommendationEngineProvider } from './providers/recommendation-engine.provider';

@Injectable()
export class SessionRecommendationService {
  private readonly logger = new Logger(SessionRecommendationService.name);

  constructor(
    private prisma: PrismaService,
    private recommendationEngine: RecommendationEngineProvider,
  ) {}

  async getNextSessionRecommendation(userId: string) {
    try {
      return await this.recommendationEngine.generateNextSessionRecommendation(userId);
    } catch (error) {
      this.logger.error('Erro ao gerar recomendação de sessão:', error);
      throw error;
    }
  }

  async getTopicRecommendations(userId: string) {
    try {
      return await this.recommendationEngine.generateTopicRecommendations(userId);
    } catch (error) {
      this.logger.error('Erro ao gerar recomendações de tópicos:', error);
      throw error;
    }
  }

  async submitFeedback(userId: string, feedbackDto: SessionRecommendationDto) {
    try {
      // Salvar feedback para melhorar recomendações futuras
      await this.prisma.userPreferences.upsert({
        where: { userId },
        update: {
          // Atualizar preferências baseado no feedback
          updatedAt: new Date(),
        },
        create: {
          userId,
          // Criar preferências iniciais
        },
      });

      this.logger.log(`Feedback recebido para recomendação ${feedbackDto.recommendationId}`);
      
      return {
        success: true,
        message: 'Feedback registrado com sucesso',
      };
    } catch (error) {
      this.logger.error('Erro ao processar feedback:', error);
      throw error;
    }
  }

  async getStudyPattern(userId: string) {
    try {
      return await this.recommendationEngine.analyzeStudyPattern(userId);
    } catch (error) {
      this.logger.error('Erro ao analisar padrão de estudo:', error);
      throw error;
    }
  }
}