import { StudyGoal, SessionStatus, DifficultyLevel, BloomLevel } from '@prisma/client';

export interface SessionSummary {
  totalSessions: number;
  totalStudyTime: number;
  averageSessionDuration: number;
  questionsAnswered: number;
  accuracy: number;
  currentStreak: number;
  weeklyGoalProgress: number;
}

export interface TopicPerformance {
  topic: string;
  questionsAnswered: number;
  accuracy: number;
  averageResponseTime: number;
  difficultyDistribution: Record<DifficultyLevel, number>;
  bloomDistribution: Record<BloomLevel, number>;
  lastStudied: Date;
  masteryLevel: number;
}

export interface StudyRecommendation {
  id: string;
  type: 'TOPIC' | 'DURATION' | 'DIFFICULTY' | 'SCHEDULE';
  title: string;
  description: string;
  priority: number;
  estimatedBenefit: string;
  reasoning: string;
  actionItems: string[];
  createdAt: Date;
}

export interface SessionAnalytics {
  summary: SessionSummary;
  topicPerformance: TopicPerformance[];
  weaknesses: string[];
  recommendations: StudyRecommendation[];
  progressTrend: {
    date: string;
    accuracy: number;
    studyTime: number;
    questionsAnswered: number;
  }[];
}

export interface GameficationData {
  currentStreak: number;
  longestStreak: number;
  totalAchievements: number;
  recentAchievements: Achievement[];
  nextMilestone: {
    name: string;
    progress: number;
    target: number;
    description: string;
  };
  leaderboardPosition: number;
  weeklyRank: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  unlockedAt?: Date;
  progress?: number;
  target?: number;
}