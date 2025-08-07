import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StudyGoal, DifficultyLevel, BloomLevel } from '@prisma/client';

describe('Sessions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // Criar usuário para testes
    const authResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Session Test User',
        email: 'sessions@example.com',
        password: 'password123',
      });

    authToken = authResponse.body.token;
    userId = authResponse.body.user.id;
  });

  afterAll(async () => {
    // Limpar dados de teste com verificações condicionais
    if (prisma && prisma.questionInteraction) {
      await prisma.questionInteraction.deleteMany({
        where: { session: { userId } },
      });
    }
    if (prisma && prisma.studySession) {
      await prisma.studySession.deleteMany({
        where: { userId },
      });
    }
    if (prisma && prisma.user) {
      await prisma.user.deleteMany({
        where: { id: userId },
      });
    }
    await app.close();
  });

  describe('/sessions (POST)', () => {
    beforeEach(async () => {
      // Limpar sessões apenas para este grupo de testes com verificações
      if (prisma && prisma.questionInteraction) {
        await prisma.questionInteraction.deleteMany({
          where: { session: { userId } },
        });
      }
      if (prisma && prisma.studySession) {
        await prisma.studySession.deleteMany({
          where: { userId },
        });
      }
    });

    it('deve criar nova sessão de estudo', () => {
      return request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studyGoal: StudyGoal.EXAM_PREP,
          plannedDurationMinutes: 60,
          plannedTopics: ['Cardiologia', 'Pneumologia'],
          description: 'Sessão de preparação para prova',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.studyGoal).toBe(StudyGoal.EXAM_PREP);
          expect(res.body.status).toBe('ACTIVE');
        });
    });

    it('deve falhar com dados inválidos', () => {
      return request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studyGoal: 'INVALID_GOAL',
        })
        .expect(400);
    });

    it('deve falhar sem autenticação', () => {
      return request(app.getHttpServer())
        .post('/sessions')
        .send({
          studyGoal: StudyGoal.EXAM_PREP,
        })
        .expect(401);
    });
  });

  describe('/sessions (GET)', () => {
    let sessionId: string;

    beforeAll(async () => {
      // Limpar sessões antes de criar a sessão para este grupo
      if (prisma && prisma.questionInteraction) {
        await prisma.questionInteraction.deleteMany({
          where: { session: { userId } },
        });
      }
      if (prisma && prisma.studySession) {
        await prisma.studySession.deleteMany({
          where: { userId },
        });
      }

      const sessionResponse = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studyGoal: StudyGoal.REVIEW,
        });
      
      sessionId = sessionResponse.body.id;
    });

    it('deve listar sessões do usuário', () => {
      return request(app.getHttpServer())
        .get('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('studyGoal');
        });
    });

    it('deve filtrar sessões por goal', () => {
      return request(app.getHttpServer())
        .get('/sessions')
        .query({ goal: StudyGoal.REVIEW })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach(session => {
            expect(session.studyGoal).toBe(StudyGoal.REVIEW);
          });
        });
    });

    it('deve falhar sem autenticação', () => {
      return request(app.getHttpServer())
        .get('/sessions')
        .expect(401);
    });
  });

  describe('/sessions/:id/finish (PUT)', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Limpar sessões antes de cada teste neste grupo
      if (prisma && prisma.questionInteraction) {
        await prisma.questionInteraction.deleteMany({
          where: { session: { userId } },
        });
      }
      if (prisma && prisma.studySession) {
        await prisma.studySession.deleteMany({
          where: { userId },
        });
      }

      const sessionResponse = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studyGoal: StudyGoal.PRACTICE,
        });
      
      sessionId = sessionResponse.body.id;
    });

    it('deve finalizar sessão', () => {
      return request(app.getHttpServer())
        .put(`/sessions/${sessionId}/finish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('COMPLETED');
          expect(res.body).toHaveProperty('endTime');
          expect(res.body).toHaveProperty('summary');
        });
    });

    it('deve falhar com ID inexistente', () => {
      return request(app.getHttpServer())
        .put('/sessions/nonexistent-id/finish')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/sessions/generate-question (POST)', () => {
    let sessionId: string;

    beforeAll(async () => {
      // Limpar sessões antes de criar a sessão para este grupo
      await prisma.questionInteraction.deleteMany({
        where: { session: { userId } },
      });
      await prisma.studySession.deleteMany({
        where: { userId },
      });

      const sessionResponse = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studyGoal: StudyGoal.PRACTICE,
        });
      
      sessionId = sessionResponse.body.id;
    });

    it('deve gerar questão adaptativa', async () => {
      // Pular teste se API não estiver disponível
      if (!process.env.DEEPSEEK_API_KEY) {
        console.log('Pulando teste - API DeepSeek não configurada');
        return;
      }

      // Aumentar timeout para chamadas de API
      jest.setTimeout(30000);

      return request(app.getHttpServer())
        .post('/sessions/generate-question')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
          topic: 'Cardiologia',
          bloomLevel: BloomLevel.UNDERSTAND,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('question');
          expect(res.body.question).toHaveProperty('id');
          expect(res.body.question).toHaveProperty('question');
          expect(res.body.question).toHaveProperty('options');
          expect(res.body.question.topic).toBe('Cardiologia');
        });
    });

    it('deve falhar sem sessionId', () => {
      return request(app.getHttpServer())
        .post('/sessions/generate-question')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'Cardiologia',
        })
        .expect(400);
    });
  });

  describe('/sessions/interactions (POST)', () => {
    let sessionId: string;

    beforeAll(async () => {
      // Limpar sessões antes de criar a sessão para este grupo
      await prisma.questionInteraction.deleteMany({
        where: { session: { userId } },
      });
      await prisma.studySession.deleteMany({
        where: { userId },
      });

      const sessionResponse = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studyGoal: StudyGoal.PRACTICE,
        });
      
      sessionId = sessionResponse.body.id;
    });

    it('deve criar interação com questão', async () => {
      const response = await request(app.getHttpServer())
        .post('/sessions/interactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: sessionId,
          questionId: 'test-question-id',
          topic: 'Cardiologia',
          difficultyLevel: DifficultyLevel.MEDIUM,
          bloomLevel: BloomLevel.UNDERSTAND,
          timeToAnswer: 45,
          isCorrect: true,
          confidenceLevel: 4,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.topic).toBe('Cardiologia');
      expect(response.body.difficultyLevel).toBe(DifficultyLevel.MEDIUM);
      expect(response.body.isCorrect).toBe(true);
    });

    it('deve falhar com dados inválidos', () => {
      return request(app.getHttpServer())
        .post('/sessions/interactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
          questionId: '',
          timeToAnswer: -1,
        })
        .expect(400);
    });
  });

  describe('/sessions/analytics/dashboard (GET)', () => {
    it('deve retornar dashboard do usuário', () => {
      return request(app.getHttpServer())
        .get('/sessions/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('summary');
          expect(res.body.summary).toHaveProperty('totalSessions');
          expect(res.body.summary).toHaveProperty('totalStudyTime');
          expect(res.body.summary).toHaveProperty('accuracy');
          expect(res.body.summary).toHaveProperty('currentStreak');
          expect(res.body.summary).toHaveProperty('weeklyGoalProgress');
        });
    });

    it('deve falhar sem autenticação', () => {
      return request(app.getHttpServer())
        .get('/sessions/analytics/dashboard')
        .expect(401);
    });
  });

  describe('/sessions/recommendations/next-session (GET)', () => {
    it('deve retornar recomendação de próxima sessão', () => {
      return request(app.getHttpServer())
        .get('/sessions/recommendations/next-session')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('title');
          expect(res.body).toHaveProperty('description');
          expect(res.body).toHaveProperty('type');
          expect(res.body).toHaveProperty('priority');
          expect(res.body).toHaveProperty('actionItems');
        });
    });
  });

  describe('/sessions/achievements (GET)', () => {
    it('deve retornar conquistas do usuário', () => {
      return request(app.getHttpServer())
        .get('/sessions/achievements')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // Pode estar vazio para usuário novo
        });
    });
  });

  describe('/sessions/leaderboard (GET)', () => {
    it('deve retornar leaderboard', () => {
      return request(app.getHttpServer())
        .get('/sessions/leaderboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
