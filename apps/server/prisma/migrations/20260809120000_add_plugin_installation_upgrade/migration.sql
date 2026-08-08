ALTER TABLE "plugins" ADD COLUMN "latestVersionId" UUID;
ALTER TABLE "plugin_installations"
ADD COLUMN "grantedPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "plugins" AS plugin
SET "latestVersionId" = (
  SELECT version."id"
  FROM "plugin_versions" AS version
  WHERE version."pluginId" = plugin."id"
  ORDER BY version."publishedAt" DESC, version."id" DESC
  LIMIT 1
);

CREATE UNIQUE INDEX "plugins_latestVersionId_key" ON "plugins"("latestVersionId");

ALTER TABLE "plugins"
ADD CONSTRAINT "plugins_latestVersionId_fkey"
FOREIGN KEY ("latestVersionId") REFERENCES "plugin_versions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
