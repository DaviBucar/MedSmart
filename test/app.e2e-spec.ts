import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import helmet from 'helmet';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Aplicar helmet no ambiente de teste
    app.use(helmet());
    app.enableCors();
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/ (GET) - deve retornar status da aplicação', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('Hello World!');
        });
    });

    it('deve responder rapidamente ao health check', async () => {
      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .get('/')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100); // Menos de 100ms
    });
  });

  describe('Error Handling', () => {
    it('deve retornar 404 para rota inexistente', () => {
      return request(app.getHttpServer())
        .get('/nonexistent-route')
        .expect(404);
    });

    it('deve retornar 401 para rotas protegidas sem autenticação', () => {
      return request(app.getHttpServer())
        .get('/sessions')
        .expect(401);
    });
  });

  describe('CORS and Security', () => {
    it('deve incluir headers de segurança', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          // Verificar se helmet está funcionando
          expect(res.headers).toHaveProperty('x-content-type-options');
        });
    });
  });
});
