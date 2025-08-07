import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { DeepSeekResponse, AIAnalysisResult } from '../interfaces/deepseek.interface';
import axiosRetry from 'axios-retry';



@Injectable()
export class DeepSeekService {
  private readonly logger = new Logger(DeepSeekService.name);
  private readonly httpClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private configService: ConfigService) {
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
               error.response?.status >= 500;
      },
    });
  }

  async analyzeText(text: string): Promise<AIAnalysisResult> {
    try {
      // Agora o retry já está configurado no httpClient
      const response = await this.httpClient.post('/analyze', { text });
      return response.data;
    } catch (error) {
      return this.handleDeepSeekError(error);
    }
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
      "question": "Qual é a definição de [conceito principal]?",
      "type": "multiple_choice",
      "options": [
        "A) Definição correta e precisa",
        "B) Definição parcialmente correta (distrator inteligente)",
        "C) Definição com erro conceitual comum",
        "D) Definição completamente incorreta"
      ],
      "correctAnswer": 0,
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
      "studyTip": "Para compreender melhor: relacione com sua experiência pessoal"
    },
    // === BLOCO 3: APLICAÇÃO (4 questões) ===
    {
      "id": 9,
      "category": "application",
      "bloomLevel": "apply", 
      "difficulty": "medium",
      "question": "Em uma situação onde [cenário realista], como você aplicaria [conceito]?",
      "type": "multiple_choice",
      "context": "Cenário prático e relevante",
      "options": ["A) Aplicação incorreta", "B) Aplicação correta", "C) Aplicação parcial", "D) Não se aplica"],
      "correctAnswer": 1,
      "explanation": "Passo a passo da aplicação correta",
      "studyTip": "Pratique com casos similares para fixar o processo"
    },
    // === BLOCO 4: ANÁLISE (4 questões) ===
    {
      "id": 13,
      "category": "analysis",
      "bloomLevel": "analyze",
      "difficulty": "hard",
      "question": "Analisando [situação complexa], qual é a principal causa de [problema/fenômeno]?",
      "type": "multiple_choice", 
      "context": "Caso complexo que exige decomposição",
      "options": ["A) Causa superficial", "B) Causa raiz verdadeira", "C) Causa secundária", "D) Correlação, não causação"],
      "correctAnswer": 1,
      "explanation": "Análise detalhada mostrando o raciocínio",
      "studyTip": "Use frameworks de análise como 5 Porquês ou Diagrama de Ishikawa"
    },
    // === BLOCO 5: SÍNTESE/AVALIAÇÃO (4 questões) ===
    {
      "id": 17,
      "category": "synthesis",
      "bloomLevel": "evaluate",
      "difficulty": "hard",
      "question": "Considerando [múltiplas variáveis], qual seria a melhor estratégia para [objetivo complexo]?",
      "type": "multiple_choice",
      "context": "Cenário que exige julgamento e criação de soluções",
      "options": ["A) Estratégia conservadora", "B) Estratégia inovadora e eficaz", "C) Estratégia arriscada", "D) Estratégia tradicional"],
      "correctAnswer": 1,
      "explanation": "Justificativa baseada em critérios claros de avaliação",
      "studyTip": "Desenvolva critérios de avaliação antes de julgar alternativas"
    }
  ],
  "metacognition": {
    "selfAssessment": "Como você pode verificar se realmente entendeu este conteúdo?",
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
- **Hook**: Desperte curiosidade imediatamente
- **Overview**: Progressão lógica (contexto → conceitos → implicações)
- **Key Insights**: Máximo 3, ordenados por importância
- **Applications**: Exemplos concretos e relevantes
- **Why It Matters**: Conecte com objetivos pessoais/profissionais

### QUESTÕES - DISTRIBUIÇÃO EXATA:
- **5 Fixação** (Bloom 1-2): Definições, reconhecimento, compreensão básica
- **3 Compreensão** (Bloom 2): Explicação, interpretação, exemplificação  
- **4 Aplicação** (Bloom 3): Uso em situações novas, resolução de problemas
- **4 Análise** (Bloom 4): Decomposição, identificação de padrões, causas
- **4 Síntese/Avaliação** (Bloom 5-6): Julgamento, criação, inovação

### QUALIDADE DAS QUESTÕES:
- **Distradores inteligentes**: Baseados em erros conceituais reais
- **Contextos autênticos**: Situações que o estudante pode encontrar
- **Progressão cognitiva**: Das mais simples às mais complexas
- **Explicações educativas**: Não apenas "está certo/errado", mas "por quê"

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
}