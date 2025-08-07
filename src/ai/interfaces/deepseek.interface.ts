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

export interface SummaryStructure {
  hook: string;
  overview: string;
  keyInsights: string[];
  practicalApplications: string;
  whyItMatters: string;
}

export interface KeywordsStructure {
  essential: string[];
  supporting: string[];
  advanced: string[];
}

export interface LearningPath {
  prerequisites: string;
  sequence: string[];
  timeEstimate: string;
  nextSteps: string;
}

export interface EnhancedQuestion {
  id: number;
  category: string;
  bloomLevel: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  type: 'multiple_choice' | 'open_ended' | 'true_false';
  context?: string;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  studyTip: string;
}

export interface Metacognition {
  selfAssessment: string;
  commonMistakes: string[];
  deeperQuestions: string[];
  connections: string;
}

export interface StudyStrategy {
  immediate: string;
  shortTerm: string;
  mediumTerm: string;
  longTerm: string;
}

export interface EnhancedMindMapNode {
  title: string;
  level: number;
  summary?: string;
  children: EnhancedMindMapNode[];
}

export interface AIAnalysisResult {
  summary: SummaryStructure;
  keywords: KeywordsStructure;
  mindMap: EnhancedMindMapNode;
  learningPath: LearningPath;
  questions: EnhancedQuestion[];
  metacognition: Metacognition;
  studyStrategy: StudyStrategy;
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