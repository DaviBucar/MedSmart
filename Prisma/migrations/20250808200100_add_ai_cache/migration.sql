-- CreateTable
CREATE TABLE "ai_cache" (
    "id" TEXT NOT NULL,
    "cacheKey" VARCHAR(255) NOT NULL,
    "cacheType" VARCHAR(50) NOT NULL,
    "contentHash" VARCHAR(64) NOT NULL,
    "data" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hitCount" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "ai_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_cache_cacheKey_key" ON "ai_cache"("cacheKey");

-- CreateIndex
CREATE INDEX "ai_cache_cacheKey_cacheType_idx" ON "ai_cache"("cacheKey", "cacheType");

-- CreateIndex
CREATE INDEX "ai_cache_expiresAt_idx" ON "ai_cache"("expiresAt");

-- CreateIndex
CREATE INDEX "ai_cache_cacheType_lastAccessed_idx" ON "ai_cache"("cacheType", "lastAccessed");
