-- Produksi: admin database membuat extension ini sebelum migrasi; role aplikasi tidak berhak membuatnya.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "KnowledgeChunk" (
  "id" UUID NOT NULL,
  "revisionId" UUID NOT NULL,
  "position" INTEGER NOT NULL CHECK ("position" >= 0),
  "pageNumber" INTEGER NOT NULL CHECK ("pageNumber" BETWEEN 1 AND 500),
  "text" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "model" TEXT,
  "embedding" vector(1536),
  CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeChunk_embedding_model_check" CHECK (("model" IS NULL) = ("embedding" IS NULL)),
  CONSTRAINT "KnowledgeChunk_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ContentRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "KnowledgeChunk_revisionId_position_key" ON "KnowledgeChunk"("revisionId", "position");
CREATE INDEX "KnowledgeChunk_checksum_idx" ON "KnowledgeChunk"("checksum");
