ALTER TYPE "ContentKind" ADD VALUE 'knowledge';

CREATE TABLE "DocumentAsset" (
  "id" UUID NOT NULL,
  "storageKey" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "size" INTEGER NOT NULL CHECK ("size" > 0 AND "size" <= 20971520),
  "pageCount" INTEGER NOT NULL CHECK ("pageCount" BETWEEN 1 AND 500),
  "needsOcr" BOOLEAN NOT NULL,
  "parserVersion" TEXT NOT NULL,
  "uploadedBy" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentAsset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DocumentAsset_storageKey_key" ON "DocumentAsset"("storageKey");

CREATE TABLE "DocumentPage" (
  "documentId" UUID NOT NULL,
  "number" INTEGER NOT NULL CHECK ("number" BETWEEN 1 AND 500),
  "text" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  CONSTRAINT "DocumentPage_pkey" PRIMARY KEY ("documentId", "number"),
  CONSTRAINT "DocumentPage_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "RevisionDocument" (
  "revisionId" UUID NOT NULL,
  "documentId" UUID NOT NULL,
  CONSTRAINT "RevisionDocument_pkey" PRIMARY KEY ("revisionId"),
  CONSTRAINT "RevisionDocument_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ContentRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RevisionDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "RevisionDocument_documentId_idx" ON "RevisionDocument"("documentId");
