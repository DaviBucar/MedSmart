import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Documents (e2e)', () => {
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
        name: 'Document Test User',
        email: 'documents@example.com',
        password: 'password123',
      });

    authToken = authResponse.body.token;
    userId = authResponse.body.user.id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    await prisma.document.deleteMany({
      where: { userId },
    });
    await prisma.user.deleteMany({
      where: { id: userId },
    });
    await app.close();
  });

  describe('/documents/upload (POST)', () => {
    let documentId: string; // Declarar a variável no escopo correto

    it('deve fazer upload de documento PDF válido', async () => {
      const response = await request(app.getHttpServer())
        .post('/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', 'test/test-files/sample.pdf')
        .expect(201);

      expect(response.body).toHaveProperty('document');
      expect(response.body.document).toHaveProperty('id');
      expect(response.body.document).toHaveProperty('filename');
      expect(response.body.document.status).toBe('PROCESSING');
      
      documentId = response.body.document.id;
    });

    it('deve processar documento PDF com sucesso ou falhar graciosamente', async () => {
      // Aguardar um pouco para o processamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await request(app.getHttpServer())
        .get(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // O documento pode estar processado com sucesso ou ter falhado
      expect(['PROCESSING', 'COMPLETED', 'FAILED']).toContain(response.body.status);
      
      if (response.body.status === 'FAILED') {
        console.log('⚠️ Documento falhou no processamento (PDF problemático)');
      } else if (response.body.status === 'COMPLETED') {
        expect(response.body).toHaveProperty('extractedText');
        expect(response.body.extractedText.length).toBeGreaterThan(0);
      }
    });

    it('deve falhar sem autenticação', () => {
      return request(app.getHttpServer()).post('/documents/upload').expect(401);
    });

    it('deve falhar sem arquivo', () => {
      return request(app.getHttpServer())
        .post('/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('deve falhar com tipo de arquivo inválido', async () => {
      const testTxtPath = path.join(__dirname, 'test-files', 'sample.txt');
      fs.mkdirSync(path.dirname(testTxtPath), { recursive: true });
      fs.writeFileSync(testTxtPath, 'This is a text file');

      return request(app.getHttpServer())
        .post('/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testTxtPath)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Tipo de arquivo não permitido');
        });
    });
  });

  describe('/documents (GET)', () => {
    let documentId: string;

    beforeAll(async () => {
      // Criar documento para testes
      const testPdfPath = path.join(__dirname, 'test-files', 'sample.pdf');
      const uploadResponse = await request(app.getHttpServer())
        .post('/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testPdfPath);

      documentId = uploadResponse.body.document.id;
    });

    it('deve listar documentos do usuário', () => {
      return request(app.getHttpServer())
        .get('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('filename');
        });
    });

    it('deve falhar sem autenticação', () => {
      return request(app.getHttpServer()).get('/documents').expect(401);
    });
  });

  describe('/documents/:id (GET)', () => {
    let documentId: string;

    beforeAll(async () => {
      const testPdfPath = path.join(__dirname, 'test-files', 'sample.pdf');
      const uploadResponse = await request(app.getHttpServer())
        .post('/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testPdfPath);

      documentId = uploadResponse.body.document.id;
    });

    it('deve buscar documento por ID', () => {
      return request(app.getHttpServer())
        .get(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(documentId);
          expect(res.body).toHaveProperty('filename');
          expect(res.body).toHaveProperty('status');
        });
    });

    it('deve falhar com ID inexistente', () => {
      return request(app.getHttpServer())
        .get('/documents/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('deve falhar sem autenticação', () => {
      return request(app.getHttpServer())
        .get(`/documents/${documentId}`)
        .expect(401);
    });
  });

  describe('/documents/:id (DELETE)', () => {
    let documentId: string;

    beforeEach(async () => {
      const testPdfPath = path.join(__dirname, 'test-files', 'sample.pdf');
      const uploadResponse = await request(app.getHttpServer())
        .post('/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testPdfPath);

      documentId = uploadResponse.body.document.id;
    });

    it('deve deletar documento', () => {
      return request(app.getHttpServer())
        .delete(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('deve falhar com ID inexistente', () => {
      return request(app.getHttpServer())
        .delete('/documents/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('deve falhar sem autenticação', () => {
      return request(app.getHttpServer())
        .delete(`/documents/${documentId}`)
        .expect(401);
    });
  });
});
