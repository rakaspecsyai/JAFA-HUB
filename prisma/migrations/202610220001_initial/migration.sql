-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('editor', 'approver', 'admin');

-- CreateEnum
CREATE TYPE "ContentKind" AS ENUM ('profession', 'article', 'regulation', 'faq', 'page');

-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('draft', 'submitted', 'returned', 'approved');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" UUID NOT NULL,
    "kind" "ContentKind" NOT NULL,
    "slug" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "publishedRevisionId" UUID,
    "firstPublishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentRevision" (
    "id" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "RevisionStatus" NOT NULL DEFAULT 'draft',
    "payload" JSONB NOT NULL,
    "reviewedOn" TEXT NOT NULL,
    "authorId" UUID,
    "submitterId" UUID,
    "reviewerId" UUID,
    "note" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceReference" (
    "id" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "internalRef" TEXT,
    "publisher" TEXT NOT NULL DEFAULT '',
    "reviewedOn" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "SourceReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionProfession" (
    "revisionId" UUID NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "RevisionProfession_pkey" PRIMARY KEY ("revisionId","key")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "attribution" TEXT NOT NULL,
    "uploadedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionMedia" (
    "revisionId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "alt" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "RevisionMedia_pkey" PRIMARY KEY ("revisionId","mediaId")
);

-- CreateTable
CREATE TABLE "PublishedSearchEntry" (
    "itemId" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "kind" "ContentKind" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "professions" TEXT[],
    "publishedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishedSearchEntry_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "revisionId" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "requestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentItem_publishedRevisionId_key" ON "ContentItem"("publishedRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentItem_kind_slug_key" ON "ContentItem"("kind", "slug");

-- CreateIndex
CREATE INDEX "ContentRevision_status_updatedAt_idx" ON "ContentRevision"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentRevision_itemId_number_key" ON "ContentRevision"("itemId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");

-- CreateIndex
CREATE INDEX "PublishedSearchEntry_kind_publishedAt_idx" ON "PublishedSearchEntry"("kind", "publishedAt");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_publishedRevisionId_fkey" FOREIGN KEY ("publishedRevisionId") REFERENCES "ContentRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRevision" ADD CONSTRAINT "ContentRevision_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ContentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceReference" ADD CONSTRAINT "SourceReference_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ContentRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionProfession" ADD CONSTRAINT "RevisionProfession_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ContentRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionMedia" ADD CONSTRAINT "RevisionMedia_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ContentRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionMedia" ADD CONSTRAINT "RevisionMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedSearchEntry" ADD CONSTRAINT "PublishedSearchEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Only one active working revision per content item.
CREATE UNIQUE INDEX "ContentRevision_one_working_revision" ON "ContentRevision"("itemId") WHERE status IN ('draft', 'submitted', 'returned');

-- Guard the publication pointer even when a future caller bypasses application validation.
CREATE FUNCTION jafa_validate_publication() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."publishedRevisionId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "ContentRevision" r WHERE r.id = NEW."publishedRevisionId" AND r."itemId" = NEW.id AND r.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Invalid publication pointer' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ContentItem_publication_guard" BEFORE INSERT OR UPDATE OF "publishedRevisionId" ON "ContentItem"
FOR EACH ROW EXECUTE FUNCTION jafa_validate_publication();
