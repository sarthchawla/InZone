-- CreateTable
CREATE TABLE "mcp_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mcp_tokens_tokenHash_key" ON "mcp_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "mcp_tokens_userId_idx" ON "mcp_tokens"("userId");

-- CreateIndex
CREATE INDEX "mcp_tokens_tokenHash_idx" ON "mcp_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "mcp_tokens_revokedAt_idx" ON "mcp_tokens"("revokedAt");

-- AddForeignKey
ALTER TABLE "mcp_tokens" ADD CONSTRAINT "mcp_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
