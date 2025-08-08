import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
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
      console.log(`⚠️ Usuário ${userId} já possui sessão ativa: ${activeSession.id}`);
      throw new ForbiddenException('Já existe uma sessão ativa. Finalize-a antes de criar uma nova.');
    }
  }

  async validateUserCanAccessSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.studySession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      console.log(`❌ Sessão ${sessionId} não encontrada para usuário ${userId}`);
      throw new NotFoundException('Sessão não encontrada');
    }
  }

  async validateSessionCanBeFinished(sessionId: string): Promise<void> {
    const session = await this.prisma.studySession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      console.log(`❌ Sessão ${sessionId} não encontrada`);
      throw new NotFoundException('Sessão não encontrada');
    }

    if (session.status === SessionStatus.COMPLETED) {
      console.log(`⚠️ Sessão ${sessionId} já está finalizada`);
      throw new ForbiddenException('Esta sessão já foi finalizada');
    }

    // Allow finishing sessions that are ACTIVE, PAUSED, COMPLETED, or ABANDONED
    if (![SessionStatus.ACTIVE, SessionStatus.PAUSED, SessionStatus.COMPLETED, SessionStatus.ABANDONED].includes(session.status)) {
      console.log(`⚠️ Sessão ${sessionId} não pode ser finalizada. Status atual: ${session.status}`);
      throw new ForbiddenException('Apenas sessões ativas, pausadas ou abandonadas podem ser finalizadas');
    }
  }

  async validateSessionIsActive(sessionId: string): Promise<void> {
    const session = await this.prisma.studySession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      console.log(`❌ Sessão ${sessionId} não encontrada`);
      throw new NotFoundException('Sessão não encontrada');
    }

    if (session.status !== SessionStatus.ACTIVE) {
      console.log(`⚠️ Sessão ${sessionId} não está ativa. Status atual: ${session.status}`);
      throw new ForbiddenException('Esta sessão não está ativa');
    }
  }

  async validateSessionAccess(userId: string, sessionId: string) {
    const session = await this.prisma.studySession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        interactions: true,
      },
    });

    if (!session) {
      console.log(`❌ Sessão ${sessionId} não encontrada para usuário ${userId}`);
      throw new NotFoundException('Sessão não encontrada');
    }

    return session;
  }

  async validateActiveSession(userId: string, sessionId: string) {
    const session = await this.validateSessionAccess(userId, sessionId);

    if (session.status !== SessionStatus.ACTIVE) {
      console.log(`⚠️ Sessão ${sessionId} não está ativa. Status atual: ${session.status}`);
      throw new ForbiddenException('Esta sessão não está ativa');
    }

    return session;
  }

  buildSessionFilters(userId: string, filters: SessionFiltersDto) {
    const where: any = { userId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.goal) {
      where.studyGoal = filters.goal;
    }

    if (filters.startDate || filters.endDate) {
      where.startTime = {};
      if (filters.startDate) {
        where.startTime.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.startTime.lte = new Date(filters.endDate);
      }
    }

    return where;
  }

  async finishExistingActiveSessions(userId: string): Promise<void> {
    try {
      const activeSessions = await this.prisma.studySession.findMany({
        where: {
          userId,
          status: SessionStatus.ACTIVE,
        },
      });

      if (activeSessions.length > 0) {
        console.log(`🔄 Finalizando ${activeSessions.length} sessões ativas para usuário ${userId}`);
        
        await this.prisma.studySession.updateMany({
          where: {
            userId,
            status: SessionStatus.ACTIVE,
          },
          data: {
            status: SessionStatus.COMPLETED,
            endTime: new Date(),
          },
        });
        
        console.log(`✅ Sessões ativas finalizadas automaticamente`);
      }
    } catch (error) {
      console.error('❌ Erro ao finalizar sessões ativas:', error);
    }
  }
}