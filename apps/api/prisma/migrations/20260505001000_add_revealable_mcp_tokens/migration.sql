-- Add encrypted raw-token storage for users who want to reveal and copy MCP tokens later.
-- Existing hash-only rows remain valid for authentication but cannot be revealed.
ALTER TABLE "mcp_tokens" ADD COLUMN "encryptedToken" TEXT;
