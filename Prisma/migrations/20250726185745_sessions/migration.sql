-- CreateEnum
CREATE TYPE "StudyGoal" AS ENUM ('REVIEW', 'NEW_CONTENT', 'PRACTICE', 'EXAM_PREP', 'QUICK_REVIEW');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'ADAPTIVE');

-- CreateEnum
CREATE TYPE "BloomLevel" AS ENUM ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE');

-- CreateEnum
CREATE TYPE "AchievementType" AS ENUM ('STREAK', 'PERFORMANCE', 'VOLUME', 'MASTERY');

-- CreateTable
CREATE TABLE "study_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "studyGoal" "StudyGoal" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "topicsStudied" TEXT[],
    "performanceScore" SMALLINT,
    "focusScore" SMALLINT,
    "deviceType" VARCHAR(20),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_interactions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" VARCHAR(100) NOT NULL,
    "topic" VARCHAR(100) NOT NULL,
    "bloomLevel" "BloomLevel" NOT NULL,
    "timeToAnswer" SMALLINT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "difficultyLevel" "DifficultyLevel" NOT NULL,
    "confidenceLevel" SMALLINT,
    "hintsUsed" SMALLINT NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" VARCHAR(100) NOT NULL,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "lastStudied" TIMESTAMP(3),
    "masteryScore" SMALLINT NOT NULL DEFAULT 0,
    "nextReviewDate" TIMESTAMP(3),
    "reviewInterval" SMALLINT NOT NULL DEFAULT 1,
    "priority" SMALLINT NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionDuration" SMALLINT NOT NULL DEFAULT 30,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "studyGoals" "StudyGoal"[],
    "enableReminders" BOOLEAN NOT NULL DEFAULT true,
    "enableGamification" BOOLEAN NOT NULL DEFAULT true,
    "enableAI" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_metrics_cache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalStudyTime" INTEGER NOT NULL DEFAULT 0,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" SMALLINT NOT NULL DEFAULT 0,
    "longestStreak" SMALLINT NOT NULL DEFAULT 0,
    "lastStudyDate" TIMESTAMP(3),
    "overallScore" SMALLINT NOT NULL DEFAULT 0,
    "strongTopics" TEXT[],
    "weakTopics" TEXT[],
    "recommendations" JSONB,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_metrics_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "type" "AchievementType" NOT NULL,
    "icon" VARCHAR(50),
    "targetValue" INTEGER NOT NULL,
    "points" SMALLINT NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_retention_policies" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "lastCleanup" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "data_retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "study_sessions_userId_createdAt_idx" ON "study_sessions"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "study_sessions_status_createdAt_idx" ON "study_sessions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "study_sessions_studyGoal_userId_idx" ON "study_sessions"("studyGoal", "userId");

-- CreateIndex
CREATE INDEX "question_interactions_userId_timestamp_idx" ON "question_interactions"("userId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "question_interactions_topic_isCorrect_idx" ON "question_interactions"("topic", "isCorrect");

-- CreateIndex
CREATE INDEX "question_interactions_bloomLevel_userId_idx" ON "question_interactions"("bloomLevel", "userId");

-- CreateIndex
CREATE INDEX "topic_progress_nextReviewDate_priority_idx" ON "topic_progress"("nextReviewDate", "priority");

-- CreateIndex
CREATE INDEX "topic_progress_userId_masteryScore_idx" ON "topic_progress"("userId", "masteryScore");

-- CreateIndex
CREATE UNIQUE INDEX "topic_progress_userId_topic_key" ON "topic_progress"("userId", "topic");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_metrics_cache_userId_key" ON "user_metrics_cache"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_name_key" ON "achievements"("name");

-- CreateIndex
CREATE INDEX "user_achievements_userId_unlockedAt_idx" ON "user_achievements"("userId", "unlockedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_userId_achievementId_key" ON "user_achievements"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "data_retention_policies_tableName_key" ON "data_retention_policies"("tableName");

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_interactions" ADD CONSTRAINT "question_interactions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "study_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_interactions" ADD CONSTRAINT "question_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_metrics_cache" ADD CONSTRAINT "user_metrics_cache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
