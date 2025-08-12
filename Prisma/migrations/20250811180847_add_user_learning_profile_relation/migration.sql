-- CreateEnum
CREATE TYPE "LearningProfileType" AS ENUM ('BEGINNER_CAUTIOUS', 'INTERMEDIATE_AMBITIOUS', 'ADVANCED_PERFECTIONIST', 'STRATEGIC_REVIEWER');

-- CreateTable
CREATE TABLE "user_learning_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileType" "LearningProfileType" NOT NULL DEFAULT 'INTERMEDIATE_AMBITIOUS',
    "preferredDifficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "optimalSessionDuration" SMALLINT NOT NULL DEFAULT 30,
    "preferredTimeSlots" INTEGER[],
    "learningVelocity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "retentionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_learning_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_learning_profiles_userId_key" ON "user_learning_profiles"("userId");

-- AddForeignKey
ALTER TABLE "user_learning_profiles" ADD CONSTRAINT "user_learning_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
