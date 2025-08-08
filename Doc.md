# 📚 Documentação Completa da API MedSmart

## 🌟 Visão Geral

A **MedSmart API** é uma plataforma inteligente de estudos médicos que utiliza IA para personalizar a experiência de aprendizado. O sistema oferece geração adaptativa de questões, análise de performance, gamificação e recomendações personalizadas.

### 🏗️ Arquitetura
- **Base URL**: `http://localhost:3002` (desenvolvimento)
- **Autenticação**: JWT Bearer Token
- **Formato**: JSON para todas as requisições e respostas
- **Versionamento**: v1 (implícito)

### 🔧 Tecnologias
- **Backend**: NestJS + TypeScript
- **Banco de Dados**: PostgreSQL + Prisma ORM
- **IA**: DeepSeek API para geração de conteúdo
- **Cache**: Redis + In-Memory para otimização
- **Segurança**: Helmet, CORS, JWT, Validação rigorosa

---

## 🔐 MÓDULO DE AUTENTICAÇÃO (`/auth`)

### 📝 Registro de Usuário

**`POST /auth/register`**

Cria uma nova conta de usuário na plataforma.

#### Requisição
```json
{
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "password": "minhasenha123"
}
```

#### Validações
- `name`: String obrigatória
- `email`: Email válido e único
- `password`: Mínimo 6 caracteres

#### Resposta de Sucesso (201)
```json
{
  "user": {
    "id": "uuid-do-usuario",
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Erros Possíveis
- **400**: Dados inválidos ou email já existe
- **500**: Erro interno do servidor

---

### 🔑 Login de Usuário

**`POST /auth/login`**

Autentica um usuário existente e retorna token de acesso.

#### Requisição
```json
{
  "email": "joao@exemplo.com",
  "password": "minhasenha123"
}
```

#### Resposta de Sucesso (200)
```json
{
  "user": {
    "id": "uuid-do-usuario",
    "name": "João Silva",
    "email": "joao@exemplo.com"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Erros Possíveis
- **401**: Credenciais inválidas
- **400**: Dados de entrada inválidos

---

### 🔄 Renovação de Token

**`POST /auth/refresh`**

Renova um token JWT expirado.

#### Headers Obrigatórios
```

## 📚 MÓDULO DE SESSÕES DE ESTUDO (`/sessions`)

### 🎯 Gestão de Sessões

#### `POST /sessions`

**Função:** Cria uma nova sessão de estudo personalizada

- **Dados necessários:** Objetivo, dificuldade, tipo de dispositivo, descrição, tópicos planejados, duração e ambiente
- **Retorna:** Sessão criada com ID único
- **Processo:** Analisa perfil do usuário e configura sessão adaptativa

#### `GET /sessions`

**Função:** Lista todas as sessões do usuário com filtros

- **Filtros opcionais:** Status, data, tópico, dificuldade
- **Retorna:** Lista paginada de sessões
- **Ordenação:** Por data de criação (mais recente primeiro)

#### `GET /sessions/:id`

**Função:** Obtém detalhes completos de uma sessão específica

- **Retorna:** Dados da sessão, estatísticas, questões respondidas
- **Inclui:** Métricas de performance, tempo gasto, progresso

#### `PUT /sessions/:id`

**Função:** Atualiza configurações de uma sessão ativa

- **Dados opcionais:** Dificuldade, tópicos, duração
- **Retorna:** Sessão atualizada
- **Restrição:** Apenas sessões ativas podem ser modificadas

#### `DELETE /sessions/:id`

**Função:** Remove uma sessão do histórico

- **Retorna:** Confirmação de exclusão
- **Efeito:** Remove dados associados (questões, interações)

#### `POST /sessions/:id/finish`

**Função:** Finaliza uma sessão de estudo ativa

- **Processo:** Calcula métricas finais, atualiza progresso do usuário, detecta conquistas
- **Retorna:** Relatório completo da sessão
- **Efeitos:** Atualiza cache de métricas, gera recomendações

### 🧠 Geração de Questões Adaptativas

#### `POST /sessions/:id/generate-questions`

**Função:** Gera questões personalizadas usando IA

- **Dados necessários:** Tópico, nível de dificuldade, nível de Bloom
- **Dados opcionais:** Áreas de foco, tópicos a evitar, quantidade, contexto
- **Processo:** Analisa performance histórica, identifica pontos fracos, gera questões adaptadas
- **Retorna:** Lista de questões com alternativas e explicações

### 📊 Tracking de Interações

#### `POST /sessions/:id/interactions`

**Função:** Registra resposta do usuário a uma questão

- **Dados necessários:** ID da questão, resposta selecionada, tempo gasto
- **Processo:** Analisa acerto/erro, atualiza algoritmo adaptativo, detecta padrões
- **Retorna:** Feedback imediato e próxima questão sugerida

#### `GET /sessions/:id/interactions`

**Função:** Lista todas as interações de uma sessão

- **Retorna:** Histórico completo de respostas
- **Inclui:** Tempos de resposta, acertos, erros, padrões identificados

#### `POST /sessions/:id/heartbeat`

**Função:** Mantém sessão ativa e monitora engajamento

- **Processo:** Detecta inatividade, ajusta dificuldade, previne fadiga
- **Retorna:** Status da sessão e sugestões de pausa

### 📈 Analytics e Relatórios

#### `GET /sessions/analytics/dashboard`

**Função:** Fornece visão geral do progresso do usuário

- **Retorna:** Métricas principais, gráficos de evolução, estatísticas gerais
- **Inclui:** Tempo total de estudo, questões respondidas, taxa de acerto, tópicos estudados

#### `GET /sessions/analytics/progress`

**Função:** Mostra evolução do usuário ao longo do tempo

- **Filtro opcional:** Período (7 dias, 30 dias, 3 meses)
- **Retorna:** Gráficos de progresso, tendências, comparações
- **Métricas:** Performance por tópico, evolução da dificuldade, consistência

#### `GET /sessions/analytics/performance`

**Função:** Analisa performance detalhada por tópico

- **Filtro opcional:** Tópico específico
- **Retorna:** Taxa de acerto, tempo médio, dificuldade dominada
- **Insights:** Pontos fortes, áreas de melhoria, recomendações

#### `GET /sessions/analytics/weaknesses`

**Função:** Identifica pontos fracos do usuário

- **Retorna:** Tópicos com baixa performance, padrões de erro
- **Sugestões:** Planos de estudo focados, recursos adicionais

### 🎯 Recomendações Inteligentes

#### `GET /sessions/recommendations/next-session`

**Função:** Sugere configuração ideal para próxima sessão

- **Análise:** Performance recente, fadiga, horário preferido, streak
- **Retorna:** Tópicos sugeridos, dificuldade recomendada, duração ideal
- **Personalização:** Baseada em padrões individuais de aprendizado

#### `GET /sessions/recommendations/topics`

**Função:** Recomenda tópicos prioritários para estudo

- **Critérios:** Pontos fracos, tempo desde último estudo, importância
- **Retorna:** Lista priorizada de tópicos com justificativas
- **Estratégia:** Balanceia revisão e novos conteúdos

#### `POST /sessions/recommendations/feedback`

**Função:** Coleta feedback sobre recomendações

- **Dados:** Avaliação da recomendação, utilidade, precisão
- **Processo:** Melhora algoritmo de recomendação
- **Retorna:** Confirmação de feedback registrado

### 🏆 Gamificação

#### `GET /sessions/achievements`

**Função:** Lista conquistas desbloqueadas pelo usuário

- **Retorna:** Conquistas obtidas com datas e descrições
- **Tipos:** Streak, performance, dedicação, melhoria

#### `GET /sessions/achievements/available`

**Função:** Mostra conquistas disponíveis para desbloquear

- **Retorna:** Conquistas pendentes com critérios e progresso
- **Motivação:** Incentiva continuidade nos estudos

#### `GET /sessions/leaderboard`

**Função:** Exibe ranking de usuários

- **Filtro opcional:** Período (semanal, mensal, geral)
- **Retorna:** Posições, pontuações, estatísticas comparativas
- **Privacidade:** Dados anonimizados

#### `GET /sessions/streak`

**Função:** Mostra sequência de dias estudando

- **Retorna:** Streak atual, melhor streak, histórico
- **Motivação:** Incentiva consistência diária

---

## 📄 MÓDULO DE DOCUMENTOS (`/documents`)

### Gestão de Documentos

#### `POST /documents/upload`

**Função:** Faz upload de material de estudo (PDF)

- **Dados necessários:** Arquivo PDF
- **Processo:** Valida formato, extrai texto, processa com IA
- **Retorna:** Documento registrado e status de processamento
- **Formatos:** PDF (até 10MB)

#### `GET /documents`

**Função:** Lista todos os documentos do usuário

- **Retorna:** Lista de documentos com metadados
- **Inclui:** Nome, tamanho, data de upload, status de processamento

#### `GET /documents/:id`

**Função:** Obtém detalhes de um documento específico

- **Retorna:** Metadados completos, conteúdo extraído
- **Inclui:** Tópicos identificados, resumo gerado pela IA

#### `DELETE /documents/:id`

**Função:** Remove um documento do sistema

- **Processo:** Exclui arquivo e dados associados
- **Retorna:** Confirmação de exclusão

---

## 🌐 MÓDULO PRINCIPAL (`/`)

#### `GET /`

**Função:** Endpoint de status da API

- **Retorna:** Mensagem de boas-vindas e status do serviço
- **Uso:** Verificação de saúde da API

---

## 🔄 FLUXO COMPLETO DO USUÁRIO

### 1. **Onboarding**

1. **Registro** (`POST /auth/register`) - Usuário cria conta
2. **Login** (`POST /auth/login`) - Obtém token de acesso
3. **Upload de Material** (`POST /documents/upload`) - Adiciona PDFs de estudo

### 2. **Sessão de Estudo**

1. **Criar Sessão** (`POST /sessions`) - Define objetivos e configurações
2. **Gerar Questões** (`POST /sessions/:id/generate-questions`) - IA cria questões personalizadas
3. **Responder Questões** (`POST /sessions/:id/interactions`) - Registra respostas e recebe feedback
4. **Monitoramento** (`POST /sessions/:id/heartbeat`) - Sistema acompanha engajamento
5. **Finalizar** (`POST /sessions/:id/finish`) - Encerra sessão e gera relatório

### 3. **Análise e Melhoria**

1. **Dashboard** (`GET /sessions/analytics/dashboard`) - Visualiza progresso geral
2. **Performance** (`GET /sessions/analytics/performance`) - Analisa pontos fortes/fracos
3. **Recomendações** (`GET /sessions/recommendations/next-session`) - Recebe sugestões personalizadas

### 4. **Gamificação e Motivação**

1. **Conquistas** (`GET /sessions/achievements`) - Visualiza progresso gamificado
2. **Ranking** (`GET /sessions/leaderboard`) - Compara com outros usuários
3. **Streak** (`GET /sessions/streak`) - Mantém consistência diária

### 5. **Gestão Contínua**

1. **Histórico** (`GET /sessions`) - Revisa sessões anteriores
2. **Documentos** (`GET /documents`) - Gerencia material de estudo
3. **Renovação** (`POST /auth/refresh`) - Mantém acesso ativo

---

## 🎯 CARACTERÍSTICAS ESPECIAIS

### **Adaptação Inteligente**

- Sistema ajusta dificuldade automaticamente baseado na performance
- IA identifica padrões de aprendizado individuais
- Questões são geradas considerando pontos fracos específicos

### **Monitoramento em Tempo Real**

- Heartbeat detecta fadiga e sugere pausas
- Tracking contínuo de engajamento
- Ajustes automáticos durante a sessão

### **Personalização Avançada**

- Recomendações baseadas em histórico completo
- Análise de horários preferenciais
- Adaptação ao tipo de dispositivo usado

### **Gamificação Motivacional**

- Sistema de conquistas progressivas
- Ranking social competitivo
- Streak para incentivar consistência

### **Analytics Profundos**

- Dashboard com métricas visuais
- Identificação automática de pontos fracos
- Relatórios de evolução temporal

---

## 🔒 SEGURANÇA E AUTENTICAÇÃO

- **Todas as rotas** (exceto registro e login) requerem autenticação JWT
- **Tokens** têm expiração configurável
- **Dados** são isolados por usuário
- **Validações** rigorosas em todos os endpoints
- **Rate limiting** para prevenir abuso

---

## 📱 COMPATIBILIDADE

- **Dispositivos:** Desktop, tablet, mobile
- **Formatos:** JSON para todas as respostas
- **Uploads:** PDF até 10MB
- **Navegadores:** Modernos com suporte a ES6+

Esta documentação fornece uma visão completa de todas as funcionalidades da API MedSmart, permitindo que desenvolvedores frontend compreendam exatamente como integrar cada recurso da plataforma.


#### Resposta de Sucesso (200)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 📚 MÓDULO DE SESSÕES DE ESTUDO (`/sessions`)

### 🎯 Criação de Sessão

**`POST /sessions`**

Cria uma nova sessão de estudo personalizada com configurações específicas.

#### Headers Obrigatórios

Authorization: Bearer
Content-Type: application/json


#### Requisição
```json
{
  "studyGoal": "PRACTICE",
  "documentId": "uuid-do-documento",
  "difficultyLevel": "MEDIUM",
  "plannedDuration": 30,
  "description": "Sessão de prática em cardiologia",
  "plannedTopics": ["cardiologia", "arritmias"],
  "deviceType": "desktop",
  "studyEnvironment": "quiet"
}
```

#### Campos da Requisição
- `studyGoal` (obrigatório): `"REVIEW" | "NEW_CONTENT" | "PRACTICE" | "EXAM_PREP" | "QUICK_REVIEW"`
- `documentId` (opcional): UUID do documento base
- `difficultyLevel` (opcional): `"EASY" | "MEDIUM" | "HARD" | "ADAPTIVE"`
- `plannedDuration` (opcional): Duração em minutos (1-180)
- `description` (opcional): Descrição da sessão
- `plannedTopics` (opcional): Array de tópicos
- `deviceType` (opcional): Tipo de dispositivo
- `studyEnvironment` (opcional): Ambiente de estudo

#### Resposta de Sucesso (201)
```json
{
  "id": "uuid-da-sessao",
  "userId": "uuid-do-usuario",
  "status": "ACTIVE",
  "studyGoal": "PRACTICE",
  "startTime": "2024-01-15T14:30:00Z",
  "plannedDuration": 30,
  "questionsAnswered": 0,
  "correctAnswers": 0,
  "topicsStudied": [],
  "deviceType": "desktop",
  "createdAt": "2024-01-15T14:30:00Z"
}
```

---

### 📋 Listagem de Sessões

**`GET /sessions`**

Lista todas as sessões do usuário com filtros opcionais.

#### Parâmetros de Query (opcionais)
- `status`: `ACTIVE | PAUSED | COMPLETED | ABANDONED`
- `studyGoal`: `REVIEW | NEW_CONTENT | PRACTICE | EXAM_PREP | QUICK_REVIEW`
- `startDate`: Data início (ISO 8601)
- `endDate`: Data fim (ISO 8601)
- `page`: Número da página (padrão: 1)
- `limit`: Itens por página (padrão: 10, máx: 50)

#### Exemplo de URL

GET /sessions?status=COMPLETED&studyGoal=PRACTICE&page=1&limit=10


#### Resposta de Sucesso (200)
```json
{
  "data": [
    {
      "id": "uuid-da-sessao",
      "status": "COMPLETED",
      "studyGoal": "PRACTICE",
      "startTime": "2024-01-15T14:30:00Z",
      "endTime": "2024-01-15T15:00:00Z",
      "duration": 30,
      "questionsAnswered": 15,
      "correctAnswers": 12,
      "performanceScore": 80,
      "topicsStudied": ["cardiologia", "arritmias"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

### 🔍 Detalhes da Sessão

**`GET /sessions/:id`**

Obtém detalhes completos de uma sessão específica.

#### Resposta de Sucesso (200)
```json
{
  "id": "uuid-da-sessao",
  "userId": "uuid-do-usuario",
  "status": "COMPLETED",
  "studyGoal": "PRACTICE",
  "startTime": "2024-01-15T14:30:00Z",
  "endTime": "2024-01-15T15:00:00Z",
  "duration": 30,
  "questionsAnswered": 15,
  "correctAnswers": 12,
  "performanceScore": 80,
  "focusScore": 85,
  "topicsStudied": ["cardiologia", "arritmias"],
  "deviceType": "desktop",
  "interactions": [
    {
      "id": "uuid-interacao",
      "questionId": "q1",
      "topic": "cardiologia",
      "isCorrect": true,
      "timeToAnswer": 45,
      "difficultyLevel": "MEDIUM",
      "bloomLevel": "APPLY"
    }
  ],
  "createdAt": "2024-01-15T14:30:00Z",
  "updatedAt": "2024-01-15T15:00:00Z"
}
```

---

### ✏️ Atualização de Sessão

**`PUT /sessions/:id`**

Atualiza configurações de uma sessão ativa.

#### Requisição
```json
{
  "difficultyLevel": "HARD",
  "plannedTopics": ["cardiologia", "arritmias", "insuficiência cardíaca"],
  "plannedDuration": 45
}
```

#### Resposta de Sucesso (200)
```json
{
  "id": "uuid-da-sessao",
  "status": "ACTIVE",
  "difficultyLevel": "HARD",
  "plannedDuration": 45,
  "updatedAt": "2024-01-15T14:45:00Z"
}
```

---

### 🏁 Finalização de Sessão

**`POST /sessions/:id/finish`**

Finaliza uma sessão ativa e calcula métricas finais.

#### Resposta de Sucesso (200)
```json
{
  "sessionId": "uuid-da-sessao",
  "finalMetrics": {
    "duration": 32,
    "questionsAnswered": 18,
    "correctAnswers": 14,
    "averageResponseTime": 42.5,
    "performanceScore": 78,
    "focusScore": 82,
    "topicsStudied": ["cardiologia", "arritmias"]
  },
  "achievements": [
    {
      "id": "first-session",
      "title": "Primeira Sessão",
      "description": "Completou sua primeira sessão de estudos",
      "unlockedAt": "2024-01-15T15:02:00Z"
    }
  ],
  "recommendations": {
    "nextSession": {
      "suggestedTopics": ["insuficiência cardíaca"],
      "suggestedDifficulty": "MEDIUM",
      "suggestedDuration": 30,
      "reasoning": "Baseado na performance em cardiologia"
    }
  }
}
```

---

### 🧠 Geração de Questões

**`POST /sessions/:id/generate-questions`**

Gera questões personalizadas usando IA para a sessão.

#### Requisição
```json
{
  "topic": "cardiologia",
  "difficultyLevel": "MEDIUM",
  "bloomLevel": "APPLY",
  "quantity": 5,
  "focusAreas": ["diagnóstico", "tratamento"],
  "avoidTopics": ["pediatria"],
  "context": "Preparação para residência médica"
}
```

#### Campos da Requisição
- `topic` (opcional): Tópico específico
- `difficultyLevel` (opcional): `"EASY" | "MEDIUM" | "HARD" | "ADAPTIVE"`
- `bloomLevel` (opcional): `"REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" | "CREATE"`
- `quantity` (opcional): Número de questões (1-10, padrão: 5)
- `focusAreas` (opcional): Array de áreas de foco
- `avoidTopics` (opcional): Array de tópicos a evitar
- `context` (opcional): Contexto adicional

#### Resposta de Sucesso (200)
```json
{
  "questions": [
    {
      "id": "q1",
      "topic": "cardiologia",
      "question": "Paciente de 65 anos apresenta dispneia aos esforços...",
      "options": [
        {
          "id": "a",
          "text": "Insuficiência cardíaca congestiva"
        },
        {
          "id": "b",
          "text": "Infarto agudo do miocárdio"
        },
        {
          "id": "c",
          "text": "Embolia pulmonar"
        },
        {
          "id": "d",
          "text": "Pneumonia"
        }
      ],
      "correctAnswer": "a",
      "explanation": "Os sintomas descritos são característicos...",
      "difficultyLevel": "MEDIUM",
      "bloomLevel": "APPLY",
      "estimatedTime": 60
    }
  ],
  "metadata": {
    "generatedAt": "2024-01-15T14:35:00Z",
    "totalQuestions": 5,
    "averageDifficulty": "MEDIUM",
    "topics": ["cardiologia"]
  }
}
```

---

### 📊 Registro de Interação

**`POST /sessions/:id/interactions`**

Registra a resposta do usuário a uma questão.

#### Requisição
```json
{
  "questionId": "q1",
  "topic": "cardiologia",
  "selectedAnswer": "a",
  "isCorrect": true,
  "timeToAnswer": 45,
  "difficultyLevel": "MEDIUM",
  "bloomLevel": "APPLY",
  "confidenceLevel": 4,
  "hintsUsed": 0
}
```

#### Campos da Requisição
- `questionId` (obrigatório): ID da questão
- `topic` (obrigatório): Tópico da questão
- `selectedAnswer` (obrigatório): Resposta selecionada
- `isCorrect` (obrigatório): Se a resposta está correta
- `timeToAnswer` (obrigatório): Tempo em segundos
- `difficultyLevel` (obrigatório): Nível de dificuldade
- `bloomLevel` (obrigatório): Nível de Bloom
- `confidenceLevel` (opcional): Confiança de 1-5
- `hintsUsed` (opcional): Número de dicas usadas

#### Resposta de Sucesso (201)
```json
{
  "interactionId": "uuid-interacao",
  "feedback": {
    "isCorrect": true,
    "explanation": "Resposta correta! Os sintomas descritos...",
    "nextDifficulty": "MEDIUM",
    "performanceUpdate": {
      "currentScore": 78,
      "topicMastery": 65
    }
  },
  "nextQuestion": {
    "id": "q2",
    "topic": "cardiologia",
    "question": "Em relação ao tratamento da insuficiência cardíaca..."
  }
}
```

---

### 💓 Heartbeat da Sessão

**`POST /sessions/:id/heartbeat`**

Mantém a sessão ativa e monitora engajamento.

#### Requisição
```json
{
  "currentActivity": "answering",
  "focusLevel": 8,
  "lastInteraction": "2024-01-15T14:40:00Z"
}
```

#### Resposta de Sucesso (200)
```json
{
  "sessionStatus": "ACTIVE",
  "suggestions": {
    "takeBreak": false,
    "adjustDifficulty": false,
    "message": "Você está indo bem! Continue assim."
  },
  "metrics": {
    "timeActive": 15,
    "questionsAnswered": 8,
    "currentStreak": 3
  }
}
```

---

## 📈 ANALYTICS E RELATÓRIOS

### 🎯 Dashboard do Usuário

**`GET /sessions/analytics/dashboard`**

Fornece visão geral completa do progresso do usuário.

#### Resposta de Sucesso (200)
```json
{
  "overview": {
    "totalStudyTime": 1250,
    "totalSessions": 45,
    "totalQuestions": 680,
    "overallAccuracy": 78.5,
    "currentStreak": 7,
    "longestStreak": 15
  },
  "recentPerformance": {
    "last7Days": {
      "sessionsCompleted": 5,
      "averageScore": 82,
      "totalTime": 180,
      "improvement": "+5%"
    },
    "last30Days": {
      "sessionsCompleted": 18,
      "averageScore": 79,
      "totalTime": 720,
      "improvement": "+12%"
    }
  },
  "topicBreakdown": [
    {
      "topic": "cardiologia",
      "questionsAnswered": 120,
      "accuracy": 85,
      "masteryLevel": "ADVANCED",
      "lastStudied": "2024-01-15T14:30:00Z"
    },
    {
      "topic": "pneumologia",
      "questionsAnswered": 95,
      "accuracy": 72,
      "masteryLevel": "INTERMEDIATE",
      "lastStudied": "2024-01-14T16:20:00Z"
    }
  ],
  "achievements": {
    "total": 12,
    "recent": [
      {
        "id": "streak-7",
        "title": "Semana Consistente",
        "unlockedAt": "2024-01-15T15:00:00Z"
      }
    ]
  },
  "recommendations": {
    "priorityTopics": ["neurologia", "gastroenterologia"],
    "suggestedSessionDuration": 35,
    "optimalStudyTime": "14:00-16:00"
  }
}
```

---

### 📊 Progresso Temporal

**`GET /sessions/analytics/progress`**

Mostra evolução do usuário ao longo do tempo.

#### Parâmetros de Query
- `period`: `7d | 30d | 90d | 1y` (padrão: 30d)

#### Resposta de Sucesso (200)
```json
{
  "period": "30d",
  "progressData": [
    {
      "date": "2024-01-01",
      "sessionsCompleted": 2,
      "averageScore": 75,
      "studyTime": 60,
      "questionsAnswered": 25
    },
    {
      "date": "2024-01-02",
      "sessionsCompleted": 1,
      "averageScore": 82,
      "studyTime": 45,
      "questionsAnswered": 18
    }
  ],
  "trends": {
    "scoreImprovement": "+8.5%",
    "consistencyScore": 85,
    "learningVelocity": "ACCELERATING",
    "predictedNextScore": 84
  },
  "milestones": [
    {
      "date": "2024-01-10",
      "achievement": "Primeira semana completa",
      "metric": "7 dias consecutivos"
    }
  ]
}
```

---

### 🎯 Performance por Tópico

**`GET /sessions/analytics/performance`**

Analisa performance detalhada por tópico.

#### Parâmetros de Query
- `topic` (opcional): Filtrar por tópico específico

#### Resposta de Sucesso (200)
```json
{
  "topicPerformance": [
    {
      "topic": "cardiologia",
      "statistics": {
        "totalQuestions": 120,
        "correctAnswers": 102,
        "accuracy": 85,
        "averageResponseTime": 42.5,
        "difficultyDistribution": {
          "EASY": 30,
          "MEDIUM": 70,
          "HARD": 20
        }
      },
      "bloomLevelBreakdown": {
        "REMEMBER": { "accuracy": 95, "count": 20 },
        "UNDERSTAND": { "accuracy": 88, "count": 35 },
        "APPLY": { "accuracy": 82, "count": 45 },
        "ANALYZE": { "accuracy": 78, "count": 15 },
        "EVALUATE": { "accuracy": 70, "count": 5 }
      },
      "strengths": [
        "Excelente em diagnóstico básico",
        "Boa aplicação de conhecimentos teóricos"
      ],
      "weaknesses": [
        "Dificuldade em casos complexos",
        "Tempo de resposta alto em questões analíticas"
      ],
      "recommendations": [
        "Focar em casos clínicos complexos",
        "Praticar mais questões de análise"
      ],
      "masteryLevel": "ADVANCED",
      "nextReviewDate": "2024-01-20T00:00:00Z"
    }
  ],
  "overallInsights": {
    "strongestTopics": ["cardiologia", "pneumologia"],
    "weakestTopics": ["neurologia", "psiquiatria"],
    "improvementAreas": ["análise de casos", "diagnóstico diferencial"],
    "studyPlan": {
      "immediate": ["neurologia básica"],
      "shortTerm": ["casos clínicos complexos"],
      "longTerm": ["especialização em cardiologia"]
    }
  }
}
```

---

### ⚠️ Análise de Pontos Fracos

**`GET /sessions/analytics/weaknesses`**

Identifica áreas que precisam de mais atenção.

#### Resposta de Sucesso (200)
```json
{
  "weaknessAnalysis": {
    "criticalAreas": [
      {
        "topic": "neurologia",
        "severity": "HIGH",
        "accuracy": 45,
        "questionsAttempted": 30,
        "lastStudied": "2024-01-10T14:30:00Z",
        "commonMistakes": [
          "Confusão entre síndromes neurológicas",
          "Dificuldade em localização anatômica"
        ],
        "recommendedActions": [
          "Revisar anatomia do sistema nervoso",
          "Praticar casos clínicos básicos",
          "Estudar síndromes mais comuns"
        ]
      }
    ],
    "improvementOpportunities": [
      {
        "topic": "cardiologia",
        "currentLevel": "INTERMEDIATE",
        "targetLevel": "ADVANCED",
        "gapAnalysis": "Falta prática em ECG complexos",
        "estimatedTimeToImprove": "2-3 semanas",
        "suggestedResources": [
          "Casos de ECG avançados",
          "Simulações de emergência cardíaca"
        ]
      }
    ],
    "learningPatterns": {
      "bestPerformanceTime": "14:00-16:00",
      "optimalSessionLength": 35,
      "preferredDifficulty": "MEDIUM",
      "learningStyle": "visual-kinesthetic"
    }
  },
  "actionPlan": {
    "immediate": [
      "Sessão focada em neurologia básica (30 min)",
      "Revisão de anatomia do sistema nervoso"
    ],
    "thisWeek": [
      "3 sessões de neurologia",
      "2 sessões de revisão geral"
    ],
    "thisMonth": [
      "Completar módulo de neurologia",
      "Iniciar cardiologia avançada"
    ]
  }
}
```

---

## 🎯 RECOMENDAÇÕES INTELIGENTES

### 🎲 Próxima Sessão

**`GET /sessions/recommendations/next-session`**

Sugere configuração ideal para a próxima sessão de estudo.

#### Resposta de Sucesso (200)
```json
{
  "recommendation": {
    "sessionType": "FOCUSED_PRACTICE",
    "suggestedTopics": [
      {
        "topic": "neurologia",
        "priority": "HIGH",
        "reasoning": "Baixa performance recente (45% accuracy)",
        "estimatedTime": 20
      },
      {
        "topic": "cardiologia",
        "priority": "MEDIUM",
        "reasoning": "Manter nível avançado",
        "estimatedTime": 15
      }
    ],
    "suggestedDifficulty": "ADAPTIVE",
    "suggestedDuration": 35,
    "optimalStartTime": "14:30",
    "studyGoal": "PRACTICE",
    "bloomLevels": ["UNDERSTAND", "APPLY"],
    "confidence": 0.87
  },
  "reasoning": {
    "basedOn": [
      "Performance histórica",
      "Padrões de aprendizado",
      "Tempo desde último estudo",
      "Horário preferencial"
    ],
    "factors": {
      "recentPerformance": "Queda em neurologia",
      "timePattern": "Melhor performance à tarde",
      "streakStatus": "7 dias consecutivos",
      "fatigueLevel": "LOW"
    }
  },
  "alternatives": [
    {
      "type": "QUICK_REVIEW",
      "duration": 15,
      "topics": ["cardiologia"],
      "reasoning": "Manter conhecimento consolidado"
    },
    {
      "type": "NEW_CONTENT",
      "duration": 45,
      "topics": ["gastroenterologia"],
      "reasoning": "Expandir conhecimento"
    }
  ]
}
```

---

### 📚 Recomendações de Tópicos

**`GET /sessions/recommendations/topics`**

Recomenda tópicos prioritários baseados na análise de performance.

#### Resposta de Sucesso (200)
```json
{
  "prioritizedTopics": [
    {
      "topic": "neurologia",
      "priority": 1,
      "urgency": "HIGH",
      "reasoning": "Performance crítica (45% accuracy)",
      "estimatedStudyTime": "3-4 horas",
      "subtopics": [
        "anatomia básica do SNC",
        "síndromes neurológicas comuns",
        "exame neurológico"
      ],
      "prerequisites": [],
      "difficulty": "EASY",
      "bloomLevel": "UNDERSTAND"
    },
    {
      "topic": "gastroenterologia",
      "priority": 2,
      "urgency": "MEDIUM",
      "reasoning": "Não estudado recentemente (15 dias)",
      "estimatedStudyTime": "2-3 horas",
      "subtopics": [
        "doenças do trato digestivo",
        "hepatologia básica"
      ],
      "prerequisites": ["anatomia digestiva"],
      "difficulty": "MEDIUM",
      "bloomLevel": "APPLY"
    }
  ],
  "studyPlan": {
    "thisWeek": [
      {
        "day": "Segunda",
        "topic": "neurologia",
        "duration": 30,
        "focus": "anatomia básica"
      },
      {
        "day": "Terça",
        "topic": "neurologia",
        "duration": 35,
        "focus": "síndromes comuns"
      }
    ],
    "nextWeek": [
      {
        "day": "Segunda",
        "topic": "gastroenterologia",
        "duration": 40,
        "focus": "introdução geral"
      }
    ]
  },
  "balanceStrategy": {
    "reviewRatio": 0.3,
    "newContentRatio": 0.4,
    "practiceRatio": 0.3,
    "reasoning": "Equilibrio entre consolidação e expansão"
  }
}
```

---

## 🏆 GAMIFICAÇÃO

### 🎖️ Conquistas do Usuário

**`GET /sessions/achievements`**

Lista todas as conquistas desbloqueadas pelo usuário.

#### Resposta de Sucesso (200)
```json
{
  "achievements": [
    {
      "id": "first-session",
      "title": "Primeira Sessão",
      "description": "Completou sua primeira sessão de estudos",
      "category": "MILESTONE",
      "rarity": "COMMON",
      "points": 10,
      "unlockedAt": "2024-01-10T14:30:00Z",
      "icon": "🎯"
    },
    {
      "id": "streak-7",
      "title": "Semana Consistente",
      "description": "Estudou por 7 dias consecutivos",
      "category": "STREAK",
      "rarity": "UNCOMMON",
      "points": 50,
      "unlockedAt": "2024-01-15T15:00:00Z",
      "icon": "🔥"
    },
    {
      "id": "cardiology-master",
      "title": "Mestre em Cardiologia",
      "description": "Alcançou 90% de acerto em cardiologia",
      "category": "MASTERY",
      "rarity": "RARE",
      "points": 100,
      "unlockedAt": "2024-01-14T16:20:00Z",
      "icon": "❤️"
    }
  ],
  "summary": {
    "totalAchievements": 12,
    "totalPoints": 450,
    "rareAchievements": 2,
    "recentUnlocks": 3
  },
  "categories": {
    "MILESTONE": 4,
    "STREAK": 3,
    "MASTERY": 2,
    "PERFORMANCE": 2,
    "DEDICATION": 1
  }
}
```

---

### 🎯 Conquistas Disponíveis

**`GET /sessions/achievements/available`**

Mostra conquistas que podem ser desbloqueadas.

#### Resposta de Sucesso (200)
```json
{
  "availableAchievements": [
    {
      "id": "streak-30",
      "title": "Mês Dedicado",
      "description": "Estude por 30 dias consecutivos",
      "category": "STREAK",
      "rarity": "EPIC",
      "points": 200,
      "requirements": {
        "type": "consecutive_days",
        "target": 30,
        "current": 7,
        "progress": 23.3
      },
      "estimatedTimeToUnlock": "23 dias",
      "tips": [
        "Mantenha sessões diárias curtas",
        "Use lembretes para não quebrar a sequência"
      ],
      "icon": "🏆"
    },
    {
      "id": "neurology-expert",
      "title": "Expert em Neurologia",
      "description": "Alcance 85% de acerto em neurologia",
      "category": "MASTERY",
      "rarity": "RARE",
      "points": 100,
      "requirements": {
        "type": "topic_accuracy",
        "topic": "neurologia",
        "target": 85,
        "current": 45,
        "progress": 52.9
      },
      "estimatedTimeToUnlock": "2-3 semanas",
      "tips": [
        "Foque em anatomia básica primeiro",
        "Pratique casos clínicos simples"
      ],
      "icon": "🧠"
    }
  ],
  "motivationalMessage": "Você está a 23 dias de conquistar 'Mês Dedicado'! Continue assim! 🔥"
}
```

---

### 🏅 Ranking de Usuários

**`GET /sessions/leaderboard`**

Exibe ranking competitivo entre usuários.

#### Parâmetros de Query
- `period`: `weekly | monthly | all-time` (padrão: weekly)
- `category`: `points | accuracy | streak | study-time` (padrão: points)

#### Resposta de Sucesso (200)
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "anonymous-user-1",
      "displayName": "Estudante A***",
      "score": 1250,
      "metric": "points",
      "badge": "🥇",
      "streak": 15,
      "isCurrentUser": false
    },
    {
      "rank": 2,
      "userId": "current-user",
      "displayName": "Você",
      "score": 1180,
      "metric": "points",
      "badge": "🥈",
      "streak": 7,
      "isCurrentUser": true
    },
    {
      "rank": 3,
      "userId": "anonymous-user-2",
      "displayName": "Estudante B***",
      "score": 1050,
      "metric": "points",
      "badge": "🥉",
      "streak": 12,
      "isCurrentUser": false
    }
  ],
  "userStats": {
    "currentRank": 2,
    "totalParticipants": 156,
    "percentile": 98.7,
    "pointsToNextRank": 70,
    "improvement": "+3 posições esta semana"
  },
  "period": "weekly",
  "category": "points",
  "lastUpdated": "2024-01-15T15:00:00Z"
}
```

---

### 🔥 Streak do Usuário

**`GET /sessions/streak`**

Mostra informações sobre a sequência de dias estudando.

#### Resposta de Sucesso (200)
```json
{
  "currentStreak": {
    "days": 7,
    "startDate": "2024-01-09T00:00:00Z",
    "lastStudyDate": "2024-01-15T15:00:00Z",
    "status": "ACTIVE"
  },
  "bestStreak": {
    "days": 15,
    "startDate": "2023-12-01T00:00:00Z",
    "endDate": "2023-12-15T23:59:59Z"
  },
  "streakHistory": [
    {
      "days": 15,
      "period": "2023-12-01 a 2023-12-15",
      "achievement": "Quinzena Dedicada"
    },
    {
      "days": 7,
      "period": "2024-01-09 a 2024-01-15",
      "achievement": "Semana Consistente",
      "current": true
    }
  ],
  "motivation": {
    "nextMilestone": {
      "days": 14,
      "daysToGo": 7,
      "achievement": "Duas Semanas Seguidas",
      "reward": "50 pontos"
    },
    "encouragement": "Você está indo muito bem! Apenas 7 dias para a próxima conquista! 🔥",
    "tips": [
      "Mesmo 10 minutos de estudo mantêm o streak",
      "Configure lembretes para não esquecer",
      "Estude no mesmo horário todos os dias"
    ]
  },
  "statistics": {
    "totalStreaks": 3,
    "averageStreakLength": 9.7,
    "longestBreak": 5,
    "consistencyScore": 78
  }
}
```

---

## 📄 MÓDULO DE DOCUMENTOS (`/documents`)

### 📤 Upload de Documento

**`POST /documents/upload`**

Faz upload de material de estudo em formato PDF.

#### Headers Obrigatórios

Authorization: Bearer
Content-Type: multipart/form-data

#### Requisição (Form Data)

file: [arquivo PDF]


#### Validações
- Formato: Apenas PDF
- Tamanho máximo: 10MB
- Nome do arquivo: Obrigatório

#### Resposta de Sucesso (201)
```json
{
  "document": {
    "id": "uuid-do-documento",
    "filename": "cardiologia-basica-20240115.pdf",
    "originalName": "Cardiologia Básica.pdf",
    "mimeType": "application/pdf",
    "size": 2048576,
    "status": "PROCESSING",
    "createdAt": "2024-01-15T14:30:00Z"
  },
  "processing": {
    "estimatedTime": "2-3 minutos",
    "stages": [
      "Extração de texto",
      "Análise de conteúdo",
      "Geração de resumo",
      "Identificação de tópicos",
      "Criação de mapa mental"
    ]
  }
}
```

#### Erros Possíveis
- **400**: Arquivo inválido ou muito grande
- **415**: Tipo de arquivo não suportado
- **413**: Arquivo excede limite de tamanho

---

### 📋 Listagem de Documentos

**`GET /documents`**

Lista todos os documentos do usuário.

#### Parâmetros de Query (opcionais)
- `status`: `PENDING | PROCESSING | COMPLETED | FAILED`
- `page`: Número da página (padrão: 1)
- `limit`: Itens por página (padrão: 10)

#### Resposta de Sucesso (200)
```json
{
  "documents": [
    {
      "id": "uuid-do-documento",
      "filename": "cardiologia-basica-20240115.pdf",
      "originalName": "Cardiologia Básica.pdf",
      "mimeType": "application/pdf",
      "size": 2048576,
      "status": "COMPLETED",
      "createdAt": "2024-01-15T14:30:00Z",
      "updatedAt": "2024-01-15T14:33:00Z",
      "analysis": {
        "summary": "Documento aborda conceitos fundamentais...",
        "topicsCount": 15,
        "questionsGenerated": 25
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  },
  "statistics": {
    "totalDocuments": 5,
    "totalSize": "15.2 MB",
    "processingQueue": 0,
    "completedAnalyses": 5
  }
}
```

---

### 📖 Detalhes do Documento

**`GET /documents/:id`**

Obtém detalhes completos de um documento específico.

#### Resposta de Sucesso (200)
```json
{
  "document": {
    "id": "uuid-do-documento",
    "filename": "cardiologia-basica-20240115.pdf",
    "originalName": "Cardiologia Básica.pdf",
    "mimeType": "application/pdf",
    "size": 2048576,
    "status": "COMPLETED",
    "createdAt": "2024-01-15T14:30:00Z",
    "updatedAt": "2024-01-15T14:33:00Z"
  },
  "analysis": {
    "id": "uuid-da-analise",
    "summary": "Este documento apresenta os conceitos fundamentais da cardiologia, incluindo anatomia cardíaca, fisiologia, principais patologias e abordagens diagnósticas...",
    "keywords": [
      "cardiologia",
      "anatomia cardíaca",
      "fisiologia",
      "arritmias",
      "insuficiência cardíaca",
      "infarto do miocárdio"
    ],
    "mindMap": {
      "title": "Cardiologia Básica",
      "children": [
        {
          "title": "Anatomia",
          "children": [
            { "title": "Câmaras cardíacas", "children": [] },
            { "title": "Válvulas", "children": [] },
            { "title": "Sistema de condução", "children": [] }
          ]
        },
        {
          "title": "Fisiologia",
          "children": [
            { "title": "Ciclo cardíaco", "children": [] },
            { "title": "Débito cardíaco", "children": [] }
          ]
        },
        {
          "title": "Patologias",
          "children": [
            { "title": "Arritmias", "children": [] },
            { "title": "Insuficiência cardíaca", "children": [] },
            { "title": "Doença coronariana", "children": [] }
          ]
        }
      ]
    },
    "questions": [
      {
        "id": "doc-q1",
        "question": "Qual é a função principal do ventrículo esquerdo?",
        "options": [
          { "id": "a", "text": "Bombear sangue para os pulmões" },
          { "id": "b", "text": "Bombear sangue para o corpo" },
          { "id": "c", "text": "Receber sangue dos pulmões" },
          { "id": "d", "text": "Receber sangue do corpo" }
        ],
        "correctAnswer": "b",
        "explanation": "O ventrículo esquerdo é responsável por bombear sangue oxigenado para todo o corpo através da aorta.",
        "topic": "anatomia cardíaca",
        "difficulty": "EASY",
        "bloomLevel": "REMEMBER"
      }
    ],
    "createdAt": "2024-01-15T14:33:00Z"
  },
  "usage": {
    "sessionsUsed": 3,
    "questionsGenerated": 25,
    "lastUsed": "2024-01-15T15:00:00Z"
  }
}
```

---

### 🗑️ Exclusão de Documento

**`DELETE /documents/:id`**

Remove um documento e todos os dados associados.

#### Resposta de Sucesso (200)
```json
{
  "message": "Documento removido com sucesso",
  "deletedDocument": {
    "id": "uuid-do-documento",
    "filename": "cardiologia-basica-20240115.pdf",
    "originalName": "Cardiologia Básica.pdf"
  },
  "cleanup": {
    "fileRemoved": true,
    "analysisRemoved": true,
    "relatedDataRemoved": true
  }
}
```

---

## 🌐 MÓDULO PRINCIPAL (`/`)

### ❤️ Status da API

**`GET /`**

Endpoint de verificação de saúde da API.

#### Resposta de Sucesso (200)
```json
{
  "message": "MedSmart API está funcionando!",
  "version": "1.0.0",
  "timestamp": "2024-01-15T15:00:00Z",
  "status": "healthy",
  "services": {
    "database": "connected",
    "ai": "available",
    "cache": "active"
  }
}
```

---

## 🔄 FLUXOS COMPLETOS DE USO

### 1. 🚀 Onboarding Completo

```javascript
// 1. Registro
const registerResponse = await fetch('/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'João Silva',
    email: 'joao@exemplo.com',
    password: 'minhasenha123'
  })
});

// 2. Login (se necessário)
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'joao@exemplo.com',
    password: 'minhasenha123'
  })
});

const { access_token } = await loginResponse.json();

// 3. Upload de material
const formData = new FormData();
formData.append('file', pdfFile);

const uploadResponse = await fetch('/documents/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${access_token}` },
  body: formData
});
```

### 2. 📚 Sessão de Estudo Completa

```javascript
// 1. Obter recomendação
const recommendationResponse = await fetch('/sessions/recommendations/next-session', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});

// 2. Criar sessão
const sessionResponse = await fetch('/sessions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    studyGoal: 'PRACTICE',
    difficultyLevel: 'MEDIUM',
    plannedDuration: 30
  })
});

const { id: sessionId } = await sessionResponse.json();

// 3. Gerar questões
const questionsResponse = await fetch(`/sessions/${sessionId}/generate-questions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    topic: 'cardiologia',
    quantity: 5
  })
});

// 4. Loop de resposta às questões
const { questions } = await questionsResponse.json();

for (const question of questions) {
  // Apresentar questão ao usuário
  const userAnswer = await presentQuestionToUser(question);
  
  // Registrar resposta
  await fetch(`/sessions/${sessionId}/interactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      questionId: question.id,
      topic: question.topic,
      selectedAnswer: userAnswer.selected,
      isCorrect: userAnswer.selected === question.correctAnswer,
      timeToAnswer: userAnswer.timeSpent,
      difficultyLevel: question.difficultyLevel,
      bloomLevel: question.bloomLevel
    })
  });
  
  // Heartbeat periódico
  await fetch(`/sessions/${sessionId}/heartbeat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      currentActivity: 'answering',
      focusLevel: 8
    })
  });
}

// 5. Finalizar sessão
const finishResponse = await fetch(`/sessions/${sessionId}/finish`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${access_token}` }
});

const finalReport = await finishResponse.json();
```

### 3. 📊 Dashboard e Analytics

```javascript
// 1. Dashboard principal
const dashboardResponse = await fetch('/sessions/analytics/dashboard', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});

// 2. Progresso temporal
const progressResponse = await fetch('/sessions/analytics/progress?period=30d', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});

// 3. Performance por tópico
const performanceResponse = await fetch('/sessions/analytics/performance', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});

// 4. Conquistas
const achievementsResponse = await fetch('/sessions/achievements', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});

// 5. Ranking
const leaderboardResponse = await fetch('/sessions/leaderboard?period=weekly', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
```

---

## 🔒 SEGURANÇA E AUTENTICAÇÃO

### 🛡️ Autenticação JWT

Todas as rotas (exceto `/auth/register`, `/auth/login` e `/`) requerem autenticação JWT.

#### Header Obrigatório

Authorization: Bearer


#### Estrutura do Token
```json
{
  "sub": "uuid-do-usuario",
  "email": "usuario@exemplo.com",
  "iat": 1642248000,
  "exp": 1642334400
}
```

### 🔐 Políticas de Segurança

- **CORS**: Configurado para domínios específicos
- **Helmet**: Headers de segurança aplicados
- **Rate Limiting**: Proteção contra abuso
- **Validação**: Todos os inputs são validados
- **Sanitização**: Dados são sanitizados antes do processamento
- **Isolamento**: Dados são isolados por usuário

### ⚠️ Códigos de Erro Comuns

| Código | Descrição | Ação Recomendada |
|--------|-----------|------------------|
| 400 | Bad Request | Verificar formato dos dados |
| 401 | Unauthorized | Renovar token ou fazer login |
| 403 | Forbidden | Verificar permissões |
| 404 | Not Found | Verificar se recurso existe |
| 413 | Payload Too Large | Reduzir tamanho do arquivo |
| 415 | Unsupported Media Type | Verificar tipo de arquivo |
| 422 | Unprocessable Entity | Corrigir dados de entrada |
| 429 | Too Many Requests | Aguardar antes de nova tentativa |
| 500 | Internal Server Error | Reportar erro ao suporte |

---

## 📱 COMPATIBILIDADE E ESPECIFICAÇÕES

### 🌐 Compatibilidade
- **Navegadores**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Dispositivos**: Desktop, tablet, mobile
- **Sistemas**: Windows, macOS, Linux, iOS, Android

### 📋 Especificações Técnicas
- **Formato de Dados**: JSON (UTF-8)
- **Tamanho Máximo de Requisição**: 10MB
- **Timeout de Requisição**: 30 segundos
- **Rate Limit**: 100 requisições/minuto por usuário
- **Compressão**: Gzip suportado

### 🔧 Headers Recomendados

#### Para todas as requisições:

Content-Type: application/json
Accept: application/json
Authorization: Bearer
User-Agent:

#### Para uploads:

Content-Type: multipart/form-data
Authorization: Bearer


---

## 🚀 EXEMPLOS DE IMPLEMENTAÇÃO

### React/Next.js

```typescript
// hooks/useAuth.ts
export const useAuth = () => {
  const [token, setToken] = useState<string | null>(null);
  
  const login = async (email: string, password: string) => {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    setToken(data.access_token);
    localStorage.setItem('token', data.access_token);
  };
  
  return { token, login };
};

// hooks/useSession.ts
export const useSession = () => {
  const { token } = useAuth();
  
  const createSession = async (config: CreateSessionDto) => {
    const response = await fetch('/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    
    return response.json();
  };
  
  return { createSession };
};
```

### Vue.js

```typescript
// composables/useAPI.ts
export const useAPI = () => {
  const token = ref<string | null>(null);
  
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  };
  
  return { apiCall, token };
};
```

### Angular

```typescript
// services/api.service.ts
@Injectable()
export class ApiService {
  private baseUrl = '/api';
  
  constructor(private http: HttpClient) {}
  
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
  
  createSession(config: CreateSessionDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/sessions`, config, {
      headers: this.getHeaders()
    });
  }
  
  generateQuestions(sessionId: string, config: GenerateQuestionDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/sessions/${sessionId}/generate-questions`, config, {
      headers: this.getHeaders()
    });
  }
}
```

---

## 📞 SUPORTE E RECURSOS ADICIONAIS

### 🆘 Suporte Técnico
- **Documentação**: Esta documentação completa
- **Logs**: Disponíveis no console do navegador
- **Debugging**: Use ferramentas de desenvolvedor do navegador

### 🔍 Monitoramento
- **Health Check**: `GET /` para verificar status da API
- **Métricas**: Disponíveis através dos endpoints de analytics
- **Performance**: Monitoramento automático de tempo de resposta

### 📈 Otimizações
- **Cache**: Implementado para reduzir latência
- **Compressão**: Gzip automático para respostas grandes
- **CDN**: Recomendado para assets estáticos

---

Esta documentação fornece todas as informações necessárias para desenvolver um frontend completo e funcional para a plataforma MedSmart. Cada endpoint está detalhadamente documentado com exemplos práticos, códigos de erro, validações e fluxos de uso completos.