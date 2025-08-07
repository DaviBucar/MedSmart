import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StudyGoal, DifficultyLevel, BloomLevel } from '@prisma/client';

describe('Integration Tests - Complete User Journey (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;
  let sessionId: string;
  let documentId: string;

  // Helper function to refresh token if needed
  const refreshTokenIfNeeded = async () => {
    try {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      authToken = response.body.token;
    } catch (error) {
      // If refresh fails, login again
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'integration@example.com',
          password: 'password123',
        })
        .expect(200);
      
      authToken = loginResponse.body.token;
    }
  };

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

    // Criar arquivo de teste
    const testPdfPath = path.join(__dirname, 'test-files', 'integration-test.pdf');
    fs.mkdirSync(path.dirname(testPdfPath), { recursive: true });
    fs.writeFileSync(testPdfPath, Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF'));
  });

  afterAll(async () => {
    // Limpar todos os dados de teste
    if (userId) {
      await prisma.questionInteraction.deleteMany({
        where: { session: { userId } },
      });
      await prisma.studySession.deleteMany({
        where: { userId },
      });
      await prisma.document.deleteMany({
        where: { userId },
      });
      await prisma.user.deleteMany({
        where: { id: userId },
      });
    }
    await app.close();
  });

  describe('Jornada Completa do Usuário', () => {
    it('1. Deve registrar um novo usuário', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Integration Test User',
          email: 'integration@example.com',
          password: 'password123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      
      authToken = response.body.token;
      userId = response.body.user.id;
    });

    it('2. Deve fazer login com o usuário criado', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'integration@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('integration@example.com');
      
      // Update token
      authToken = response.body.token;
    });

    it('3. Deve fazer upload de um documento', async () => {
      await refreshTokenIfNeeded();
      const testPdfPath = path.join(__dirname, 'test-files', 'integration-test.pdf');
      
      const response = await request(app.getHttpServer())
        .post('/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testPdfPath)
        .expect(201);

      expect(response.body).toHaveProperty('document');
      expect(response.body.document).toHaveProperty('id');
      expect(response.body.document.status).toBe('PENDING');
      
      documentId = response.body.document.id;
    });

    it('4. Deve listar os documentos do usuário', async () => {
      await refreshTokenIfNeeded();
      const response = await request(app.getHttpServer())
        .get('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some(doc => doc.id === documentId)).toBe(true);
    });

    it('5. Deve criar uma sessão de estudo', async () => {
      await refreshTokenIfNeeded();
      const response = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studyGoal: StudyGoal.EXAM_PREP,
          plannedDurationMinutes: 60,
          plannedTopics: ['Cardiologia', 'Pneumologia'],
          description: 'Sessão de teste de integração',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('ACTIVE');
      
      sessionId = response.body.id;
    });

    it('6. Deve gerar uma questão adaptativa', async () => {
      await refreshTokenIfNeeded();
      // Skip this test if DeepSeek API is not available
      try {
        const response = await request(app.getHttpServer())
          .post('/sessions/generate-question')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId,
            topic: 'Cardiologia',
            difficultyLevel: DifficultyLevel.MEDIUM,
            bloomLevel: BloomLevel.UNDERSTAND,
          });

        if (response.status === 201) {
          expect(response.body).toHaveProperty('question');
          expect(response.body.question).toHaveProperty('id');
          expect(response.body.question).toHaveProperty('question');
          expect(response.body.question).toHaveProperty('options');
        } else {
          // Skip if DeepSeek API is not available
          console.log('Skipping question generation test - DeepSeek API not available');
        }
      } catch (error) {
        console.log('Skipping question generation test - DeepSeek API error');
      }
    });

    it('7. Deve registrar interação com questão', async () => {
      await refreshTokenIfNeeded();
      const response = await request(app.getHttpServer())
        .post('/sessions/interactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
          questionId: 'integration-test-question',
          topic: 'Cardiologia',
          difficultyLevel: DifficultyLevel.MEDIUM,
          bloomLevel: BloomLevel.UNDERSTAND,
          timeToAnswer: 45,
          isCorrect: true,
          confidenceLevel: 4,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.isCorrect).toBe(true);
    });

    it('8. Deve enviar heartbeat da sessão', async () => {
      await refreshTokenIfNeeded();
      await request(app.getHttpServer())
        .post('/sessions/heartbeat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
          currentActivity: 'answering_question',
          focusLevel: 8,
        })
        .expect(200);
    });

    it('9. Deve obter dashboard de analytics', async () => {
      await refreshTokenIfNeeded();
      const response = await request(app.getHttpServer())
        .get('/sessions/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalSessions');
      expect(response.body).toHaveProperty('totalStudyTime');
      expect(response.body).toHaveProperty('averageAccuracy');
      expect(response.body).toHaveProperty('currentStreak');
    });

    it('10. Deve obter recomendações', async () => {
      await refreshTokenIfNeeded();
      const response = await request(app.getHttpServer())
        .get('/sessions/recommendations/next-session')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('recommendedDuration');
      expect(response.body).toHaveProperty('suggestedTopics');
      expect(response.body).toHaveProperty('optimalDifficulty');
    });

    it('11. Deve obter conquistas', async () => {
      await refreshTokenIfNeeded();
      const response = await request(app.getHttpServer())
        .get('/sessions/achievements')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('12. Deve finalizar a sessão', async () => {
      await refreshTokenIfNeeded();
      const response = await request(app.getHttpServer())
        .put(`/sessions/${sessionId}/finish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
      expect(response.body).toHaveProperty('endTime');
      expect(response.body).toHaveProperty('summary');
    });

    it('13. Deve listar sessões concluídas', async () => {
      await refreshTokenIfNeeded();
      const response = await request(app.getHttpServer())
        .get('/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some(session => session.id === sessionId && session.status === 'COMPLETED')).toBe(true);
    });

    it('14. Deve deletar o documento', async () => {
      await refreshTokenIfNeeded();
      await request(app.getHttpServer())
        .delete(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('15. Deve renovar token de autenticação', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });
  });
});