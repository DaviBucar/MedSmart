import { jest } from '@jest/globals';

// Mock do PrismaService
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({
    flashcard: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createMany: jest.fn(),
    },
    flashcardReview: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    flashcardDeck: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    flashcardDeckItem: {
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    studySession: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  })),
}));

// Mock do DeepSeekService
jest.mock('../ai/services/deepseek.service', () => ({
  DeepSeekService: jest.fn().mockImplementation(() => ({
    generateQuestion: jest.fn(),
    analyzeText: jest.fn(),
  })),
}));

// Configurações globais para testes
global.console = {
  ...console,
  // Silenciar logs durante os testes
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock de datas para testes consistentes
const mockDate = new Date('2024-01-01T00:00:00.000Z');
jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
Date.now = jest.fn(() => mockDate.getTime());

// Configuração de timeout para testes
jest.setTimeout(10000);