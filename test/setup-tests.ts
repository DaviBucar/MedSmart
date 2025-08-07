import { setupTestEnvironment, cleanupTestEnvironment } from './setup';

// Setup global para todos os testes E2E
beforeAll(async () => {
  await setupTestEnvironment();
}, 120000); // Aumentado para 2 minutos

// Cleanup global após todos os testes
afterAll(async () => {
  await cleanupTestEnvironment();
}, 60000); // Aumentado para 1 minuto

// Configurações globais de timeout
jest.setTimeout(60000); // Aumentado para 1 minuto