-- CreateEnum
CREATE TYPE "FlashcardType" AS ENUM ('SUMMARY_BASED', 'KEYWORD_BASED', 'MIND_MAP_BASED', 'PDF_CONTENT_BASED', 'QUESTION_BASED');

-- CreateEnum
CREATE TYPE "FlashcardStatus" AS ENUM ('PENDING', 'ACTIVE', 'MASTERED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReviewResult" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

-- CreateTable
CREATE TABLE "flashcards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "documentId" TEXT,
    "type" "FlashcardType" NOT NULL,
    "status" "FlashcardStatus" NOT NULL DEFAULT 'PENDING',
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficultyLevel" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "sourceContent" TEXT,
    "sourceType" TEXT,
    "sourceReference" TEXT,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReviewDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "correctReviews" INTEGER NOT NULL DEFAULT 0,
    "averageResponseTime" DOUBLE PRECISION,
    "lastReviewResult" "ReviewResult",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastReviewedAt" TIMESTAMP(3),

    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcard_reviews" (
    "id" TEXT NOT NULL,
    "flashcardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "result" "ReviewResult" NOT NULL,
    "responseTime" DOUBLE PRECISION,
    "confidence" INTEGER DEFAULT 3,
    "deviceType" TEXT,
    "studyEnvironment" TEXT,
    "timeOfDay" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcard_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcard_decks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#3B82F6',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "allowSharing" BOOLEAN NOT NULL DEFAULT false,
    "totalFlashcards" INTEGER NOT NULL DEFAULT 0,
    "masteredCards" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flashcard_decks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcard_deck_items" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "flashcardId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcard_deck_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flashcards_userId_status_idx" ON "flashcards"("userId", "status");

-- CreateIndex
CREATE INDEX "flashcards_userId_nextReviewDate_idx" ON "flashcards"("userId", "nextReviewDate");

-- CreateIndex
CREATE INDEX "flashcards_sessionId_idx" ON "flashcards"("sessionId");

-- CreateIndex
CREATE INDEX "flashcards_documentId_idx" ON "flashcards"("documentId");

-- CreateIndex
CREATE INDEX "flashcards_topic_idx" ON "flashcards"("topic");

-- CreateIndex
CREATE INDEX "flashcards_type_idx" ON "flashcards"("type");

-- CreateIndex
CREATE INDEX "flashcard_reviews_flashcardId_idx" ON "flashcard_reviews"("flashcardId");

-- CreateIndex
CREATE INDEX "flashcard_reviews_userId_reviewedAt_idx" ON "flashcard_reviews"("userId", "reviewedAt");

-- CreateIndex
CREATE INDEX "flashcard_reviews_sessionId_idx" ON "flashcard_reviews"("sessionId");

-- CreateIndex
CREATE INDEX "flashcard_decks_userId_idx" ON "flashcard_decks"("userId");

-- CreateIndex
CREATE INDEX "flashcard_deck_items_deckId_position_idx" ON "flashcard_deck_items"("deckId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "flashcard_deck_items_deckId_flashcardId_key" ON "flashcard_deck_items"("deckId", "flashcardId");

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "study_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_reviews" ADD CONSTRAINT "flashcard_reviews_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_reviews" ADD CONSTRAINT "flashcard_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_reviews" ADD CONSTRAINT "flashcard_reviews_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "study_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_decks" ADD CONSTRAINT "flashcard_decks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_deck_items" ADD CONSTRAINT "flashcard_deck_items_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "flashcard_decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_deck_items" ADD CONSTRAINT "flashcard_deck_items_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
