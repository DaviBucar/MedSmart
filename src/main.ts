import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { useContainer } from 'class-validator';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  useContainer(app.select(AppModule), {
    fallbackOnErrors: true,
  });
  
  // Log de todas as requisições DEPOIS do parsing automático do NestJS
  app.use((req, res, next) => {
    console.log(`🌐 ${req.method} ${req.url}`);
    console.log('📋 Headers:', req.headers);
    console.log('📦 Body:', req.body);
    next();
  });
  
  app.use(helmet());
  app.enableCors();
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // Força a porta 3002
  const port = 3002;
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  await app.listen(port);
}
bootstrap();
