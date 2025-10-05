-- CreateEnum
CREATE TYPE "Status" AS ENUM ('active', 'expired', 'qualified', 'rejected');

-- CreateEnum
CREATE TYPE "FunnelStep" AS ENUM ('collect_name', 'collect_birth_date', 'collect_weight_loss_reason', 'qualified', 'rejected');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'AI');

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'active',
    "funnel_step" "FunnelStep" NOT NULL DEFAULT 'collect_name',
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "name" TEXT,
    "birth_date" TIMESTAMP(3),
    "weight_loss_reason" TEXT,
    "qualified" BOOLEAN,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_phone_number_key" ON "conversations"("phone_number");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
