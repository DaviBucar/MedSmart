import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    // Limpar dados de teste
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test',
        },
      },
    });
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('deve registrar um novo usuário com dados válidos', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('token');
          expect(res.body.user.email).toBe('test@example.com');
          expect(res.body.user.name).toBe('Test User');
          expect(res.body.user).not.toHaveProperty('password');
        });
    });

    it('deve falhar ao registrar com email duplicado', async () => {
      // Primeiro registro
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User 2',
          email: 'test2@example.com',
          password: 'password123',
        });

      // Segundo registro com mesmo email
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User 3',
          email: 'test2@example.com',
          password: 'password456',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Email already in use');
        });
    });

    it('deve falhar com dados inválidos', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: '',
          email: 'invalid-email',
          password: '123', // muito curta
        })
        .expect(400);
    });

    it('deve falhar sem dados obrigatórios', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({})
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    beforeAll(async () => {
      // Criar usuário para testes de login
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Login Test User',
          email: 'login@example.com',
          password: 'password123',
        });
    });

    it('deve fazer login com credenciais válidas', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('token');
          expect(res.body.user.email).toBe('login@example.com');
        });
    });

    it('deve falhar com senha incorreta', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('deve falhar com email inexistente', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);
    });

    it('deve falhar com dados inválidos', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: '',
        })
        .expect(400);
    });
  });

  describe('/auth/refresh (POST)', () => {
    let authToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        });
      authToken = response.body.token;
    });

    it('deve renovar token com token válido', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('token');
          expect(res.body).toHaveProperty('user');
        });
    });

    it('deve falhar sem token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .expect(401);
    });

    it('deve falhar com token inválido', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});