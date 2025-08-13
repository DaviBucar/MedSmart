# Módulo de Flashcards

Este módulo implementa um sistema completo de flashcards com algoritmo de repetição espaçada (SM-2) para otimizar o aprendizado.

## Funcionalidades Principais

### 1. Gerenciamento de Flashcards
- **Criação**: Criação manual ou automática via IA
- **Edição**: Atualização de conteúdo, tópicos e metadados
- **Exclusão**: Remoção de flashcards
- **Listagem**: Paginação e filtros por status, tópico e dificuldade
- **Busca**: Por tópico específico

### 2. Sistema de Revisão
- **Algoritmo SM-2**: Implementação do algoritmo de repetição espaçada
- **Revisões Inteligentes**: Cálculo automático de intervalos baseado no desempenho
- **Status Dinâmico**: Transição automática entre PENDING → ACTIVE → MASTERED/DIFFICULT
- **Métricas**: Tracking de tempo de resposta, confiança e precisão

### 3. Geração Automática via IA
- **Por Sessão de Estudo**: Geração baseada em sessões existentes
- **Por Conteúdo**: Geração a partir de texto fornecido
- **Configurável**: Quantidade e tipo de flashcards personalizáveis
- **Inteligente**: Análise de conteúdo para criar perguntas relevantes

### 4. Organização em Decks
- **Criação de Decks**: Agrupamento temático de flashcards
- **Compartilhamento**: Decks públicos e privados
- **Personalização**: Cores e descrições customizáveis
- **Gestão**: Adição/remoção de flashcards em decks

### 5. Analytics e Estatísticas
- **Performance Individual**: Estatísticas por flashcard
- **Performance por Tópico**: Análise de desempenho por área
- **Histórico de Revisões**: Tracking completo de atividades
- **Recomendações**: Sugestões personalizadas de estudo

## Estrutura do Módulo

```
src/flashcards/
├── controllers/
│   ├── flashcards.controller.ts          # Controlador principal
│   ├── flashcard-deck.controller.ts      # Gestão de decks
│   └── flashcard-analytics.controller.ts # Analytics
├── services/
│   ├── flashcards.service.ts             # Serviço principal
│   ├── flashcard-review.service.ts       # Sistema de revisão
│   ├── flashcard-generation.service.ts   # Geração via IA
│   ├── flashcard-deck.service.ts         # Gestão de decks
│   └── flashcard-analytics.service.ts    # Analytics
├── dto/
│   ├── create-flashcard.dto.ts
│   ├── update-flashcard.dto.ts
│   ├── review-flashcard.dto.ts
│   ├── create-deck.dto.ts
│   ├── update-deck.dto.ts
│   └── add-to-deck.dto.ts
├── utils/
│   ├── flashcard.utils.ts                # Utilitários gerais
│   └── spaced-repetition.config.ts       # Configurações SM-2
└── flashcards.module.ts                  # Módulo principal
```

## Algoritmo de Repetição Espaçada (SM-2)

O sistema utiliza o algoritmo SM-2 para otimizar os intervalos de revisão:

### Parâmetros
- **Ease Factor**: Fator de facilidade (padrão: 2.5)
- **Interval**: Intervalo em dias até próxima revisão
- **Repetitions**: Número de repetições consecutivas corretas

### Lógica de Cálculo
1. **Primeira revisão**: 1 dia
2. **Segunda revisão**: 6 dias
3. **Revisões subsequentes**: Intervalo anterior × Ease Factor

### Ajustes por Performance
- **Resposta correta**: Aumenta Ease Factor
- **Resposta incorreta**: Diminui Ease Factor e reseta repetições
- **Confiança alta**: Bonus no Ease Factor
- **Tempo de resposta**: Influencia cálculos futuros

## Status dos Flashcards

- **PENDING**: Recém-criado, aguardando primeira revisão
- **ACTIVE**: Em processo de aprendizado
- **MASTERED**: Dominado (8+ repetições, EF > 2.8, precisão > 85%)
- **DIFFICULT**: Problemático (EF < 2.0, precisão < 40%)
- **ARCHIVED**: Arquivado pelo usuário

## Tipos de Flashcards

- **QUESTION_BASED**: Pergunta e resposta tradicional
- **SUMMARY_BASED**: Resumos e conceitos
- **KEYWORD_BASED**: Definições de termos
- **MIND_MAP_BASED**: Mapas mentais
- **PDF_CONTENT_BASED**: Baseado em conteúdo de PDFs

## Níveis de Dificuldade

- **EASY**: Conceitos básicos
- **MEDIUM**: Nível intermediário
- **HARD**: Conceitos avançados

## APIs Principais

### Flashcards
- `POST /flashcards` - Criar flashcard
- `GET /flashcards` - Listar flashcards (paginado)
- `GET /flashcards/:id` - Obter flashcard específico
- `PATCH /flashcards/:id` - Atualizar flashcard
- `DELETE /flashcards/:id` - Excluir flashcard
- `GET /flashcards/topic/:topic` - Flashcards por tópico

### Revisão
- `GET /flashcards/review/due` - Flashcards para revisão
- `GET /flashcards/review/count` - Contagem de revisões pendentes
- `POST /flashcards/:id/review` - Revisar flashcard

### Geração
- `POST /flashcards/generate/session/:sessionId` - Gerar por sessão
- `POST /flashcards/generate/content` - Gerar por conteúdo

### Decks
- `POST /flashcards/decks` - Criar deck
- `GET /flashcards/decks` - Listar decks
- `GET /flashcards/decks/public` - Decks públicos
- `PATCH /flashcards/decks/:id` - Atualizar deck
- `DELETE /flashcards/decks/:id` - Excluir deck
- `POST /flashcards/decks/:id/flashcards` - Adicionar flashcard ao deck
- `DELETE /flashcards/decks/:id/flashcards/:flashcardId` - Remover do deck

### Analytics
- `GET /flashcards/analytics` - Estatísticas do usuário

## Configurações

### Perfis de Repetição Espaçada
- **default**: Configuração padrão
- **medical**: Otimizado para estudos médicos
- **quick**: Revisões mais frequentes

### Parâmetros Configuráveis
- Intervalos iniciais
- Fatores de facilidade
- Thresholds para mudança de status
- Limites de confiança

## Testes

O módulo inclui testes unitários completos:
- Serviços principais
- Controladores
- Utilitários
- Algoritmos de repetição espaçada

### Executar Testes
```bash
# Todos os testes do módulo
npm test -- --testPathPattern=flashcards

# Com coverage
npm test -- --testPathPattern=flashcards --coverage

# Testes específicos
npm test flashcards.service.spec.ts
```

## Dependências

- **@nestjs/common**: Framework base
- **@prisma/client**: ORM para banco de dados
- **class-validator**: Validação de DTOs
- **class-transformer**: Transformação de dados

## Integração com Outros Módulos

- **AI Module**: Geração automática de flashcards
- **Auth Module**: Autenticação e autorização
- **Prisma Module**: Acesso ao banco de dados
- **Sessions Module**: Integração com sessões de estudo
- **Documents Module**: Geração baseada em documentos

## Considerações de Performance

- Paginação em todas as listagens
- Índices otimizados no banco de dados
- Cache de estatísticas frequentes
- Lazy loading de relacionamentos
- Batch operations para operações em massa

## Roadmap Futuro

- [ ] Sincronização offline
- [ ] Gamificação (pontos, badges)
- [ ] Colaboração em tempo real
- [ ] Importação/exportação de decks
- [ ] Integração com calendário
- [ ] Notificações push para revisões
- [ ] Análise de curva de esquecimento
- [ ] Recomendações baseadas em ML