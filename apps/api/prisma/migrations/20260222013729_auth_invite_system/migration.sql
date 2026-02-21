-- AlterTable
ALTER TABLE "session" ADD COLUMN     "impersonatedBy" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "banExpires" TIMESTAMP(3),
ADD COLUMN     "banReason" TEXT,
ADD COLUMN     "banned" BOOLEAN,
ADD COLUMN     "displayUsername" TEXT,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "invite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_request" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "role" TEXT NOT NULL DEFAULT 'user',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_question" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invite_token_key" ON "invite"("token");

-- CreateIndex
CREATE INDEX "invite_email_idx" ON "invite"("email");

-- CreateIndex
CREATE INDEX "invite_status_idx" ON "invite"("status");

-- CreateIndex
CREATE INDEX "access_request_email_idx" ON "access_request"("email");

-- CreateIndex
CREATE INDEX "access_request_status_idx" ON "access_request"("status");

-- CreateIndex
CREATE UNIQUE INDEX "security_question_userId_order_key" ON "security_question"("userId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- AddForeignKey
ALTER TABLE "invite" ADD CONSTRAINT "invite_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_question" ADD CONSTRAINT "security_question_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK constraints for data integrity
ALTER TABLE "invite" ADD CONSTRAINT "invite_role_check" CHECK ("role" IN ('admin', 'user'));
ALTER TABLE "access_request" ADD CONSTRAINT "access_request_role_check" CHECK ("role" IN ('admin', 'user'));
ALTER TABLE "access_request" ADD CONSTRAINT "access_request_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected'));
ALTER TABLE "invite" ADD CONSTRAINT "invite_status_check" CHECK ("status" IN ('pending', 'accepted', 'expired', 'revoked'));
