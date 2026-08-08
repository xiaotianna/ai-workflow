-- 第三方包名只负责定位来源；plugins.id 是平台内部 UUID。
ALTER TABLE "plugins" ADD COLUMN "packageName" VARCHAR(214);

UPDATE "plugins"
SET "packageName" = CASE
  WHEN "publisherKey" = 'local' THEN "slug"
  ELSE '@' || "publisherKey" || '/' || "slug"
END;

ALTER TABLE "plugins" ALTER COLUMN "packageName" SET NOT NULL;
ALTER TABLE "plugin_versions" RENAME COLUMN "publisherName" TO "authorName";

UPDATE "plugin_versions" AS version
SET "authorName" = author."username"
FROM "plugins" AS plugin
JOIN "users" AS author ON author."id" = plugin."publisherId"
WHERE version."pluginId" = plugin."id";

DROP INDEX "plugins_publisherKey_slug_key";
ALTER TABLE "plugins" DROP COLUMN "publisherKey";
ALTER TABLE "plugins" DROP COLUMN "slug";

CREATE UNIQUE INDEX "plugins_packageName_key" ON "plugins"("packageName");
