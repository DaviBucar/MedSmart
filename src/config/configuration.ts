// src/config/configuration.ts

import { config as loadEnv } from 'dotenv';
loadEnv();

export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),

  database: {
    url: process.env.DATABASE_URL ?? '',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    expiresIn: process.env.JWT_EXPIRATION ?? '3600s',
  },

  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY ?? '',
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB por padrão
    allowedMimeTypes: ['application/pdf'],
    uploadDir: process.env.UPLOAD_DIR || './uploads',
  },
});
