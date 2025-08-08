import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { DeepSeekResponse, AIAnalysisResult } from '../interfaces/deepseek.interface';
import { AICacheService } from './ai-cache.service';
import axiosRetry from 'axios-retry';



@Injectable()
export class DeepSeekService {
  private readonly logger = new Logger(DeepSeekService.name);
  private readonly httpClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(
    private configService: ConfigService,
    private cacheService: AICacheService,
  ) {
    this.apiKey = this.configService.get<string>('deepseek.apiKey') || '';
    this.baseUrl = this.configService.get<string>('deepseek.baseUrl') || 'https://api.deepseek.com';
    this.model = this.configService.get<string>('deepseek.model') || 'deepseek-chat';

    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY é obrigatório. Configure a variável de ambiente.');
    }

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 segundos
    });

    // Configurar retry no cliente axios
    axiosRetry(this.httpClient, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
               Boolean(error.response?.status && error.response.status >= 500);
      },
    });
  }

  async analyzeText(text: string): Promise<AIAnalysisResult> {
    // 1. Verificar cache primeiro (economia de custos)
    const cachedResult = await this.cacheService.get('analysis', text);
    if (cachedResult) {
      this.logger.debug('Análise retornada do cache');
      return cachedResult;
    }

    try {
      const prompt = this.buildAnalysisPrompt(text);
      
      // 2. Fazer chamada para API apenas se não estiver em cache
      const response = await this.httpClient.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        stream: false
      });

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Resposta vazia da API DeepSeek');
      }

      // 3. Processar resposta
      const analysisResult = this.parseAnalysisResponse(content);
      
      // 4. Armazenar no cache (TTL: 24 horas para análises)
      await this.cacheService.set('analysis', text, analysisResult, 24 * 60);
      
      this.logger.log('Nova análise gerada e armazenada em cache');
      return analysisResult;

    } catch (error) {
      this.logger.error('Erro na análise, retornando fallback:', error instanceof Error ? error.message : 'Unknown error');
      return this.createFallbackResponse();
    }
  }

  async generateQuestion(prompt: string): Promise<any> {
    // 1. Verificar cache primeiro
    const cachedQuestion = await this.cacheService.get('question', prompt);
    if (cachedQuestion) {
      this.logger.debug('Questão retornada do cache');
      return cachedQuestion;
    }

    try {
      // 2. Fazer chamada para API
      const response = await this.httpClient.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8, // Mais criatividade para questões
        max_tokens: 1000,
        stream: false
      });

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Resposta vazia da API DeepSeek');
      }

      // 3. Processar resposta
      const questionData = this.parseQuestionResponse(content);
      
      if (questionData) {
        // 4. Armazenar no cache (TTL: 2 horas para questões)
        await this.cacheService.set('question', prompt, questionData, 2 * 60);
        this.logger.log('Nova questão gerada e armazenada em cache');
      }

      return questionData;

    } catch (error) {
      this.logger.error('Error generating question:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  private parseQuestionResponse(content: string): any {
    try {
      // Limpeza mais robusta do conteúdo
      let cleanContent = content.trim();
      
      // Remove marcadores de código markdown
      cleanContent = cleanContent.replace(/```json\n?|\n?```/g, '');
      
      // Remove possíveis caracteres de controle
      cleanContent = cleanContent.replace(/[\x00-\x1F\x7F]/g, '');
      
      // Tenta encontrar o JSON válido no conteúdo
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      const questionData = JSON.parse(cleanContent);
      return questionData;
    } catch (parseError) {
      this.logger.error('Erro ao fazer parse da questão:', parseError);
      return null;
    }
  }

  private parseAnalysisResponse(content: string): AIAnalysisResult {
    try {
      // Limpeza mais robusta do conteúdo
      let cleanContent = content.trim();
      
      // Remove marcadores de código markdown
      cleanContent = cleanContent.replace(/```json\n?|\n?```/g, '');
      
      // Remove possíveis caracteres de controle
      cleanContent = cleanContent.replace(/[\x00-\x1F\x7F]/g, '');
      
      // Tenta encontrar o JSON válido no conteúdo
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      // Tenta fazer o parse
      const parsed = JSON.parse(cleanContent);

      // Validação básica da estrutura
      if (!parsed.summary || !parsed.keywords || !parsed.mindMap || !parsed.questions) {
        this.logger.warn('Estrutura de resposta incompleta, criando estrutura padrão');
        return this.createFallbackResponse();
      }

      // Validações adicionais com fallbacks
      if (!Array.isArray(parsed.keywords?.essential)) {
        parsed.keywords = { essential: [], supporting: [], advanced: [] };
      }

      if (!Array.isArray(parsed.questions)) {
        parsed.questions = [];
      }

      return parsed as AIAnalysisResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao fazer parse da resposta:', errorMessage);
      this.logger.error('Conteúdo original:', content.substring(0, 500));
      
      // Retorna uma resposta de fallback em vez de lançar erro
      return this.createFallbackResponse();
    }
  }

  private createFallbackResponse(): AIAnalysisResult {
    return {
      summary: {
        hook: "Conteúdo educacional disponível para análise",
        overview: "O sistema está processando o conteúdo fornecido. Devido a limitações temporárias da API de IA, uma análise básica foi gerada.",
        keyInsights: [
          "Conteúdo disponível para estudo",
          "Material educacional identificado",
          "Análise detalhada em processamento"
        ],
        practicalApplications: "O conteúdo pode ser utilizado para estudo e referência acadêmica.",
        whyItMatters: "Este material contribui para o desenvolvimento do conhecimento na área."
      },
      keywords: {
        essential: ["conceito", "estudo", "aprendizagem", "conhecimento", "educação"],
        supporting: ["análise", "compreensão", "aplicação", "desenvolvimento", "prática"],
        advanced: ["especialização", "aprofundamento", "pesquisa", "inovação", "expertise"]
      },
      mindMap: {
        title: "Conteúdo Educacional",
        level: 0,
        children: [
          {
            title: "Conceitos Fundamentais",
            level: 1,
            summary: "Base teórica do conteúdo",
            children: []
          },
          {
            title: "Aplicações Práticas",
            level: 1,
            summary: "Como aplicar o conhecimento",
            children: []
          },
          {
            title: "Desenvolvimento Avançado",
            level: 1,
            summary: "Aprofundamento e especialização",
            children: []
          }
        ]
      },
      learningPath: {
        prerequisites: "Conhecimentos básicos na área de estudo",
        sequence: [
          "Passo 1: Revisar conceitos fundamentais",
          "Passo 2: Praticar aplicações básicas",
          "Passo 3: Desenvolver compreensão avançada"
        ],
        timeEstimate: "2-4 horas de estudo dedicado",
        nextSteps: "Buscar materiais complementares e exercícios práticos"
      },
      questions: [
        {
          id: 1,
          category: "fixation",
          bloomLevel: "remember",
          difficulty: "easy",
          question: "Qual é o conceito principal abordado no material?",
          type: "multiple_choice",
          options: [
            "A) Conceito fundamental da área",
            "B) Conceito secundário",
            "C) Conceito avançado",
            "D) Conceito não relacionado"
          ],
          correctAnswer: 0,
          explanation: "O conceito principal é a base para compreender todo o material.",
          studyTip: "Foque na definição clara e precisa do conceito principal."
        }
      ],
      metacognition: {
        selfAssessment: "Você consegue explicar os conceitos principais com suas próprias palavras?",
        commonMistakes: ["Confundir conceitos similares", "Não relacionar teoria com prática", "Memorizar sem compreender"],
        deeperQuestions: ["Como este conhecimento se aplica em situações reais?", "Quais são as limitações deste conceito?"],
        connections: "Este conteúdo se conecta com conhecimentos prévios em sua área de estudo."
      },
      studyStrategy: {
        immediate: "Faça um resumo dos pontos principais em suas próprias palavras",
        shortTerm: "Revise os conceitos principais e teste sua compreensão",
        mediumTerm: "Aplique o conhecimento em exercícios práticos",
        longTerm: "Integre este conhecimento com outros tópicos da área"
      }
    };
  }

  private buildAnalysisPrompt(text: string): string {
    return `
# ESPECIALISTA EM ANÁLISE EDUCACIONAL AVANÇADA

Você é um pedagogo especialista com formação em Ciências Cognitivas e Neuroeducação. Crie uma análise educacional completa seguindo rigorosamente as melhores práticas de aprendizagem baseadas em evidências.

## ESTRUTURA OBRIGATÓRIA (JSON):

{
  "summary": {
    "hook": "Frase impactante que desperta interesse (1 linha)",
    "overview": "Visão geral clara e objetiva (2-3 parágrafos, 150-200 palavras)",
    "keyInsights": [
      "Insight principal 1 - o mais importante",
      "Insight principal 2 - segunda prioridade", 
      "Insight principal 3 - terceira prioridade"
    ],
    "practicalApplications": "Como aplicar esse conhecimento na prática (100-150 palavras)",
    "whyItMatters": "Por que esse conteúdo é relevante e importante (80-100 palavras)"
  },
  "keywords": {
    "essential": ["5 conceitos que DEVEM ser dominados"],
    "supporting": ["5 conceitos complementares importantes"],
    "advanced": ["5 termos para aprofundamento futuro"]
  },
  "mindMap": {
    "title": "Título principal claro e específico",
    "level": 0,
    "children": [
      {
        "title": "Pilar Fundamental 1",
        "level": 1,
        "summary": "Explicação em 1 frase",
        "children": [
          {
            "title": "Componente 1.1",
            "level": 2,
            "summary": "Detalhe específico",
            "children": []
          },
          {
            "title": "Componente 1.2", 
            "level": 2,
            "summary": "Detalhe específico",
            "children": []
          }
        ]
      },
      {
        "title": "Pilar Fundamental 2",
        "level": 1,
        "summary": "Explicação em 1 frase",
        "children": [...]
      },
      {
        "title": "Pilar Fundamental 3",
        "level": 1,
        "summary": "Explicação em 1 frase", 
        "children": [...]
      }
    ]
  },
  "learningPath": {
    "prerequisites": "O que o estudante precisa saber antes",
    "sequence": ["Passo 1: Comece por...", "Passo 2: Em seguida...", "Passo 3: Finalize com..."],
    "timeEstimate": "Tempo estimado para dominar o conteúdo",
    "nextSteps": "O que estudar depois para continuar evoluindo"
  },
  "questions": [
    // === BLOCO 1: FIXAÇÃO (5 questões FÁCEIS) ===
    {
      "id": 1,
      "category": "fixation",
      "bloomLevel": "remember",
      "difficulty": "easy",
      "question": "Pergunta direta sobre definição ou conceito básico",
      "type": "multiple_choice",
      "options": ["A) Opção incorreta", "B) Resposta correta", "C) Opção incorreta", "D) Opção incorreta"],
      "correctAnswer": 1,
      "explanation": "Explicação clara e didática da resposta",
      "studyTip": "Para memorizar: use a técnica X ou associe com Y"
    },
    // === BLOCO 2: COMPREENSÃO (3 questões) ===
    {
      "id": 6,
      "category": "comprehension", 
      "bloomLevel": "understand",
      "difficulty": "medium",
      "question": "Por que [conceito] é importante para [contexto]?",
      "type": "multiple_choice",
      "options": ["A) Razão superficial", "B) Razão correta e fundamentada", "C) Razão parcial", "D) Razão incorreta"],
      "correctAnswer": 1,
      "explanation": "Explicação que conecta causa e efeito",
      "studyTip": "Para compreender melhor: relacione com exemplos práticos"
    },
    // === BLOCO 3: APLICAÇÃO (2 questões) ===
    {
      "id": 9,
      "category": "application",
      "bloomLevel": "apply", 
      "difficulty": "hard",
      "question": "Em uma situação onde [cenário], qual seria a melhor abordagem?",
      "type": "multiple_choice",
      "options": ["A) Abordagem inadequada", "B) Abordagem correta", "C) Abordagem parcial", "D) Abordagem incorreta"],
      "correctAnswer": 1,
      "explanation": "Explicação do raciocínio aplicado",
      "studyTip": "Para aplicar: pratique com casos similares"
    }
  ],
  "metacognition": {
    "selfAssessment": "Pergunta para o estudante avaliar sua própria compreensão",
    "commonMistakes": ["Erro conceitual comum 1", "Erro conceitual comum 2", "Erro conceitual comum 3"],
    "deeperQuestions": ["Pergunta para reflexão profunda 1", "Pergunta para reflexão profunda 2"],
    "connections": "Como este conteúdo se conecta com outros conhecimentos que você já possui?"
  },
  "studyStrategy": {
    "immediate": "O que fazer imediatamente após estudar (próximos 30 min)",
    "shortTerm": "Revisão em 24h: foque nestes pontos específicos",
    "mediumTerm": "Revisão em 1 semana: teste estes conceitos",
    "longTerm": "Revisão em 1 mês: aplique em contextos novos"
  }
}

## DIRETRIZES CRÍTICAS:

### RESUMO:
- **Hook**: Deve despertar curiosidade imediata
- **Overview**: Máximo 200 palavras, linguagem clara
- **Key Insights**: Exatamente 3 insights, ordenados por importância
- **Applications**: Exemplos concretos e práticos
- **Why It Matters**: Relevância clara para o estudante

### QUESTÕES:
- **Total**: Exatamente 10 questões
- **Distribuição**: 5 fáceis + 3 médias + 2 difíceis
- **Progressão**: Do simples ao complexo
- **Qualidade**: Cada questão deve testar compreensão real, não memorização

### MAPA MENTAL:
- **Máximo 3 pilares principais** (evita sobrecarga cognitiva)
- **Hierarquia clara**: Geral → Específico → Detalhes
- **Sumários concisos**: 1 frase por nó
- **Lógica pedagógica**: Ordem de aprendizado ideal

## TEXTO PARA ANÁLISE:
${text.substring(0, 10000)}

RESPONDA APENAS COM JSON VÁLIDO. NÃO ADICIONE TEXTO ANTES OU DEPOIS.
`;
  }

  private async handleDeepSeekError(error: any): Promise<AIAnalysisResult> {
    if (error.code === 'ENOTFOUND') {
      throw new HttpException('Erro de conexão com a API DeepSeek. Verifique sua conexão e tente novamente.', HttpStatus.SERVICE_UNAVAILABLE);
    }
    if (error.response?.status === 401) {
      throw new HttpException('Chave de API DeepSeek inválida', HttpStatus.UNAUTHORIZED);
    }
    throw new HttpException('Erro ao processar análise com IA', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}