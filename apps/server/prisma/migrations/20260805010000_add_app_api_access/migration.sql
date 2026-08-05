ALTER TABLE "apps"
ADD COLUMN "apiShareEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "apiShareToken" TEXT;

ALTER TABLE "api_keys"
ADD COLUMN "suffix" TEXT;

CREATE UNIQUE INDEX "apps_apiShareToken_key" ON "apps"("apiShareToken");
