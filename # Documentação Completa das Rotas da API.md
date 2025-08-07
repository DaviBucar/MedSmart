# Documentação Completa das Rotas da API MedSmart

## Visão Geral

A API MedSmart é uma plataforma inteligente de estudos médicos que utiliza IA para personalizar a experiência de aprendizado. O sistema é dividido em 4 módulos principais: Autenticação, Sessões de Estudo, Documentos e Aplicação Principal.

---

## 🔐 MÓDULO DE AUTENTICAÇÃO (`/auth`)

### Rotas Disponíveis

#### `POST /auth/register`

**Função:** Registra um novo usuário na plataforma

- **Dados necessários:** Nome, email, senha e papel (estudante/professor)
- **Retorna:** Dados do usuário criado e token JWT
- **Validações:** Email único, senha forte, dados obrigatórios

#### `POST /auth/login`

**Função:** Autentica um usuário existente

- **Dados necessários:** Email e senha
- **Retorna:** Token JWT e dados do usuário
- **Validações:** Credenciais válidas

#### `POST /auth/refresh`

**Função:** Renova o token JWT expirado

- **Dados necessários:** Token JWT válido no header
- **Retorna:** Novo token JWT
- **Validações:** Token válido e não expirado

---

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
