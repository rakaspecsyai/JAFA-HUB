CREATE TABLE "AiUsageMonth" (
  "month" TEXT NOT NULL PRIMARY KEY CHECK ("month" ~ '^\d{4}-\d{2}$'),
  "costMicrousd" BIGINT NOT NULL DEFAULT 0 CHECK ("costMicrousd" >= 0),
  "inputTokens" BIGINT NOT NULL DEFAULT 0 CHECK ("inputTokens" >= 0),
  "outputTokens" BIGINT NOT NULL DEFAULT 0 CHECK ("outputTokens" >= 0),
  "embeddingTokens" BIGINT NOT NULL DEFAULT 0 CHECK ("embeddingTokens" >= 0),
  "requests" INTEGER NOT NULL DEFAULT 0 CHECK ("requests" >= 0),
  "failedRequests" INTEGER NOT NULL DEFAULT 0 CHECK ("failedRequests" >= 0),
  "unmeteredRequests" INTEGER NOT NULL DEFAULT 0 CHECK ("unmeteredRequests" >= 0),
  "durationMs" BIGINT NOT NULL DEFAULT 0 CHECK ("durationMs" >= 0)
);
