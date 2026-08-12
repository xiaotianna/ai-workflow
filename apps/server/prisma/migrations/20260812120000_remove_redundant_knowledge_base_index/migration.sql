-- The lifecycle-aware composite index supersedes the original owner/update-time index.
DROP INDEX IF EXISTS "knowledge_bases_ownerId_updatedAt_idx";
