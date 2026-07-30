-- AlterTable
ALTER TABLE "apps" DROP COLUMN "kind";

-- DropEnum
DROP TYPE "AppKind";
