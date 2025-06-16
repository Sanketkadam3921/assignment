-- CreateEnum
CREATE TYPE "Category" AS ENUM ('FOOD', 'TRAVEL', 'UTILITIES', 'ENTERTAINMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "RecurringType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "category" "Category" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nextDueDate" TIMESTAMP(3),
ADD COLUMN     "recurringType" "RecurringType";
