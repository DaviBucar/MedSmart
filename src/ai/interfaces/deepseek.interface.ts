export interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AIAnalysisResult {
  summary: string;
  keywords: string[];
  mindMap: MindMapNode;
  questions: Question[];
}

export interface MindMapNode {
  title: string;
  children: MindMapNode[];
  level: number;
}

export interface Question {
  id: number;
  question: string;
  type: 'multiple_choice' | 'open_ended' | 'true_false';
  options?: string[];
  correctAnswer?: string | number;
  difficulty: 'easy' | 'medium' | 'hard';
}