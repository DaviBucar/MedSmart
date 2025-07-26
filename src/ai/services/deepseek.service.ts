import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { DeepSeekResponse, AIAnalysisResult } from '../interfaces/deepseek.interface';

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
  }

  async analyzeText(text: string): Promise<AIAnalysisResult> {
    try {
      this.logger.log('Iniciando análise de texto com DeepSeek');

      const prompt = this.buildAnalysisPrompt(text);
      
      const response = await this.httpClient.post<DeepSeekResponse>('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em análise de documentos acadêmicos. Sempre responda em formato JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Resposta vazia da API DeepSeek');
      }

      return this.parseAnalysisResponse(content);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao analisar texto com DeepSeek:', errorMessage);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new HttpException(
            'Chave de API DeepSeek inválida',
            HttpStatus.UNAUTHORIZED,
          );
        }
        if (error.response?.status === 429) {
          throw new HttpException(
            'Limite de taxa da API DeepSeek excedido',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
      
      throw new HttpException(
        'Erro ao processar análise com IA',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
      // Remove possíveis marcadores de código
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanContent);

      // Validação básica da estrutura
      if (!parsed.summary || !parsed.keywords || !parsed.mindMap || !parsed.questions) {
        throw new Error('Estrutura de resposta inválida');
      }

      // Validações adicionais
      if (!Array.isArray(parsed.keywords)) {
        throw new Error('Keywords deve ser um array');
      }

      if (!Array.isArray(parsed.questions)) {
        throw new Error('Questions deve ser um array');
      }

      return parsed as AIAnalysisResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao fazer parse da resposta:', errorMessage);
      throw new Error('Erro ao processar resposta da IA');
    }
  }
}