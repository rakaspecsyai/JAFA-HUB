-- A single statement keeps credentials, session revocation, and schema changes atomic on PostgreSQL.
DO $jafa_auth_migration$
BEGIN
ALTER TABLE "User"
  ALTER COLUMN "passwordHash" DROP NOT NULL,
  ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "image" TEXT;

ALTER TABLE "Session"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "ipAddress" TEXT,
  ADD COLUMN "userAgent" TEXT;

CREATE TABLE "Account" (
  "id" UUID NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "password" TEXT,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "refreshTokenExpiresAt" TIMESTAMP(3),
  "scope" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

INSERT INTO "Account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id"::text, 'credential', "id", "passwordHash", "createdAt", "updatedAt"
FROM "User" WHERE "passwordHash" IS NOT NULL;
UPDATE "User" SET "passwordHash" = NULL WHERE "passwordHash" IS NOT NULL;
DELETE FROM "Session";

CREATE TABLE "Verification" (
  "id" UUID NOT NULL PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

CREATE TABLE "RevisionContributor" (
  "revisionId" UUID NOT NULL REFERENCES "ContentRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  PRIMARY KEY ("revisionId", "userId")
);
CREATE INDEX "RevisionContributor_userId_idx" ON "RevisionContributor"("userId");

INSERT INTO "RevisionContributor" ("revisionId", "userId")
SELECT r."id", u."id" FROM "ContentRevision" r JOIN "User" u ON u."id" = r."authorId"
UNION
SELECT r."id", u."id" FROM "ContentRevision" r JOIN "User" u ON u."id" = r."submitterId"
UNION
SELECT r."id", u."id" FROM "AuditEvent" a
JOIN "ContentRevision" r ON r."id"::text = a."revisionId"
JOIN "User" u ON u."id" = a."actorId"
WHERE a."action" IN ('content.create', 'content.save', 'content.submit');

INSERT INTO "AuditEvent" ("id", "actorName", "action", "objectId", "note", "requestId", "createdAt")
VALUES (gen_random_uuid(), 'Migrasi autentikasi', 'account.auth-migration', 'better-auth',
  'ID akun dan hash sandi dipertahankan pada Account; sesi lama dicabut. Kontributor revisi dipulihkan dari pembuat, pengaju, dan audit yang tersedia.',
  gen_random_uuid()::text, CURRENT_TIMESTAMP);
END;
$jafa_auth_migration$;
