import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SessionStatus } from '@prisma/client';
import { SessionFiltersDto } from '../../dto/session-filters.dto';

@Injectable()
export class SessionValidatorProvider {
  constructor(private prisma: PrismaService) {}

  async validateUserCanCreateSession(userId: string): Promise<void> {
    const activeSession = await this.prisma.studySession.findFirst({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
      },
    });

    if (activeSession) {
      throw new ForbiddenException('Já existe uma sessão ativa. Finalize-a antes de criar uma nova.');
    }
  }

  async validateSessionAccess(userId: string, sessionId: string) {
    const session = await this.prisma.studySession.findFirst({
      where: { id: sessionId, userId },
      include: {
        interactions: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    return session;
  }

  async validateActiveSession(userId: string, sessionId: string) {
    const session = await this.prisma.studySession.findFirst({
      where: { id: sessionId, userId },
      include: {
        interactions: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new ForbiddenException('Apenas sessões ativas podem ser finalizadas');
    }

    return session;
  }

  buildSessionFilters(userId: string, filters: SessionFiltersDto) {
    const where: any = { userId };

    if (filters.goal) where.studyGoal = filters.goal;
    if (filters.status) where.status = filters.status;
    if (filters.topic) {
      where.topicsStudied = {
        has: filters.topic,
      };
    }
    if (filters.startDate || filters.endDate) {
      where.startTime = {};
      if (filters.startDate) where.startTime.gte = new Date(filters.startDate);
      if (filters.endDate) where.startTime.lte = new Date(filters.endDate);
    }

    return where;
  }
}