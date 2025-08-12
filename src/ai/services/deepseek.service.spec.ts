import { Test, TestingModule } from '@nestjs/testing';
import { DeepSeekService } from './deepseek.service';
import { ConfigService } from '@nestjs/config';
import { AICacheService } from './ai-cache.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock axios-retry
jest.mock('axios-retry', () => {
  return jest.fn();
});

describe('DeepSeekService', () => {
  let service: DeepSeekService;
  let configService: ConfigService;
  let cacheService: AICacheService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockAxiosInstance = {
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };

  beforeEach(async () => {
    // Setup config values BEFORE creating the module
    mockConfigService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'deepseek.apiKey':
          return 'test-api-key';
        case 'deepseek.baseUrl':
          return 'https://api.deepseek.com';
        case 'deepseek.model':
          return 'deepseek-chat';
        default:
          return undefined;
      }
    });

    // Mock axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeepSeekService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AICacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<DeepSeekService>(DeepSeekService);
    configService = module.get<ConfigService>(ConfigService);
    cacheService = module.get<AICacheService>(AICacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeText', () => {
    it('should return cached result if available', async () => {
      const text = 'Sample medical text';
      const cachedResult = {
        summary: {
          hook: 'Cached summary',
          overview: 'Cached overview',
          keyInsights: ['Insight 1'],
          practicalApplications: 'Applications',
          whyItMatters: 'Importance',
        },
        keywords: { essential: ['keyword1'], supporting: [], advanced: [] },
        mindMap: { title: 'Root', level: 0, children: [] },
        learningPath: { prerequisites: '', sequence: [], timeEstimate: '', nextSteps: '' },
        questions: [],
        metacognition: { selfAssessment: '', commonMistakes: [], deeperQuestions: [], connections: '' },
        studyStrategy: { immediate: '', shortTerm: '', mediumTerm: '', longTerm: '' },
      };

      mockCacheService.get.mockResolvedValue(cachedResult);

      const result = await service.analyzeText(text);

      expect(result).toBe(cachedResult);
      expect(mockCacheService.get).toHaveBeenCalledWith('analysis', text);
    });

    it('should make API call if not cached', async () => {
      const text = 'Sample medical text';
      const apiResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                summary: {
                  hook: 'API summary',
                  overview: 'API overview',
                  keyInsights: ['API Insight'],
                  practicalApplications: 'API Applications',
                  whyItMatters: 'API Importance',
                },
                keywords: { essential: ['api-keyword'], supporting: [], advanced: [] },
                mindMap: { title: 'API Root', level: 0, children: [] },
                learningPath: { prerequisites: '', sequence: [], timeEstimate: '', nextSteps: '' },
                questions: [],
                metacognition: { selfAssessment: '', commonMistakes: [], deeperQuestions: [], connections: '' },
                studyStrategy: { immediate: '', shortTerm: '', mediumTerm: '', longTerm: '' },
              }),
            },
          }],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 200,
            total_tokens: 300,
          },
        },
      };

      mockCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.post.mockResolvedValue(apiResponse);

      const result = await service.analyzeText(text);

      expect(result.summary.hook).toBe('API summary');
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should return fallback response on API error', async () => {
      const text = 'Sample medical text';

      mockCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.post.mockRejectedValue(new Error('API Error'));

      const result = await service.analyzeText(text);

      expect(result.summary.hook).toContain('Conteúdo educacional disponível');
      expect(result.summary.overview).toContain('limitações temporárias da API');
    });
  });

  describe('generateQuestion', () => {
    it('should return cached question if available', async () => {
      const prompt = 'Generate a cardiology question';
      const cachedQuestion = {
        question: 'Cached question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        explanation: 'Cached explanation',
      };

      mockCacheService.get.mockResolvedValue(cachedQuestion);

      const result = await service.generateQuestion(prompt);

      expect(result).toBe(cachedQuestion);
      expect(mockCacheService.get).toHaveBeenCalledWith('question', prompt);
    });

    it('should make API call if not cached', async () => {
      const prompt = 'Generate a cardiology question';
      const apiResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                question: 'What is the main symptom of heart failure?',
                options: ['Dyspnea', 'Headache', 'Nausea', 'Dizziness'],
                correctAnswer: 0,
                explanation: 'Dyspnea is the most common symptom.',
                studyTip: 'Remember cardiovascular symptoms.',
                estimatedTimeSeconds: 60,
                tags: ['cardiology'],
                context: 'Clinical scenario',
              }),
            },
          }],
          usage: {
            prompt_tokens: 50,
            completion_tokens: 100,
            total_tokens: 150,
          },
        },
      };

      mockCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.post.mockResolvedValue(apiResponse);

      const result = await service.generateQuestion(prompt);

      expect(result.question).toBe('What is the main symptom of heart failure?');
      expect(result.options).toHaveLength(4);
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should return null for malformed JSON response', async () => {
      const prompt = 'Generate a cardiology question';
      const apiResponse = {
        data: {
          choices: [{
            message: {
              content: 'Invalid JSON response',
            },
          }],
        },
      };

      mockCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.post.mockResolvedValue(apiResponse);

      const result = await service.generateQuestion(prompt);

      expect(result).toBeNull();
    });
  });

  describe('parseQuestionResponse', () => {
    it('should parse valid JSON response', () => {
      const validJson = JSON.stringify({
        question: 'Test question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        explanation: 'Test explanation',
      });

      const result = service['parseQuestionResponse'](validJson);

      expect(result).toEqual({
        question: 'Test question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        explanation: 'Test explanation',
      });
    });

    it('should handle JSON with markdown formatting', () => {
      const jsonWithMarkdown = '```json\n' + JSON.stringify({
        question: 'Test question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        explanation: 'Test explanation',
      }) + '\n```';

      const result = service['parseQuestionResponse'](jsonWithMarkdown);

      expect(result).toEqual({
        question: 'Test question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        explanation: 'Test explanation',
      });
    });
  });
});