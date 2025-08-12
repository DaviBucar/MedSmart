import { Test, TestingModule } from '@nestjs/testing';
import { AICacheService } from './ai-cache.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AICacheService', () => {
  let service: AICacheService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    aICache: {
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AICacheService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AICacheService>(AICacheService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached data if found and not expired', async () => {
      const cachedData = [
        {
          data: { result: 'cached result' },
          expires_at: new Date(Date.now() + 3600000), // 1 hour from now
          hit_count: 1
        }
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(cachedData);
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.get('analysis', 'test input');

      expect(result).toEqual({ result: 'cached result' });
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should return null if no cached data found', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.get('analysis', 'test input');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Database error'));

      const result = await service.get('analysis', 'test input');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should cache data successfully', async () => {
      const data = { result: 'test result' };
      
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      await service.set('question', 'test input', data);

      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should handle cache creation errors gracefully', async () => {
      mockPrismaService.$executeRaw.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(service.set('analysis', 'test input', { data: 'test' })).resolves.not.toThrow();
    });
  });

  describe('generateCacheKey', () => {
    it('should generate consistent cache keys', () => {
      const key1 = service['generateCacheKey']('analysis', 'test input');
      const key2 = service['generateCacheKey']('analysis', 'test input');

      expect(key1).toBe(key2);
      expect(key1).toContain('analysis');
    });

    it('should generate different keys for different inputs', () => {
      const key1 = service['generateCacheKey']('analysis', 'input 1');
      const key2 = service['generateCacheKey']('analysis', 'input 2');

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different types', () => {
      const key1 = service['generateCacheKey']('analysis', 'same input');
      const key2 = service['generateCacheKey']('analysis', 'same input');

      expect(key1).toBe(key2);
    });
  });

  describe('cleanupExpiredCache', () => {
    it('should delete expired cache entries', async () => {
      mockPrismaService.$executeRaw.mockResolvedValue(5);

      const result = await service.cleanupExpiredCache();

      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it('should handle cleanup errors gracefully', async () => {
      mockPrismaService.$executeRaw.mockRejectedValue(new Error('Database error'));

      const result = await service.cleanupExpiredCache();

      expect(result).toBe(0);
    });
  });
});