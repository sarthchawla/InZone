-- Add soft-delete fields and description to entities

-- Boards: Add soft-delete fields
ALTER TABLE "boards" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "boards" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- Columns: Add description and soft-delete fields
ALTER TABLE "columns" ADD COLUMN "description" TEXT;
ALTER TABLE "columns" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "columns" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- Todos: Add soft-delete fields
ALTER TABLE "todos" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "todos" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- Create indexes for soft-delete filtering (partial indexes for better performance)
CREATE INDEX "boards_isDeleted_idx" ON "boards"("isDeleted");
CREATE INDEX "columns_isDeleted_idx" ON "columns"("isDeleted");
CREATE INDEX "columns_boardId_position_idx" ON "columns"("boardId", "position");
CREATE INDEX "todos_isDeleted_idx" ON "todos"("isDeleted");
