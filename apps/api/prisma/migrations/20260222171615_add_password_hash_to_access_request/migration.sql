/*
  Warnings:

  - Added the required column `passwordHash` to the `access_request` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "access_request" ADD COLUMN     "passwordHash" TEXT NOT NULL;
