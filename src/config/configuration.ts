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

  aws: {
    region: process.env.AWS_REGION ?? '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    s3Bucket: process.env.S3_BUCKET_NAME ?? '',
  },

  bull: {
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
});
