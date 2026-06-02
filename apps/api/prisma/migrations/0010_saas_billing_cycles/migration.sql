-- CreateEnum
CREATE TYPE "billing_cycle_status" AS ENUM ('pending', 'paid', 'overdue', 'graced', 'suspended', 'cancelled');

-- AlterEnum
ALTER TYPE "subscription_item_type" ADD VALUE IF NOT EXISTS 'included_pos';
ALTER TYPE "subscription_item_type" ADD VALUE IF NOT EXISTS 'included_terminal';
ALTER TYPE "subscription_item_type" ADD VALUE IF NOT EXISTS 'included_branch';
ALTER TYPE "subscription_item_type" ADD VALUE IF NOT EXISTS 'included_cfdi';
ALTER TYPE "subscription_item_type" ADD VALUE IF NOT EXISTS 'extra_pos';
ALTER TYPE "subscription_item_type" ADD VALUE IF NOT EXISTS 'extra_terminal';
ALTER TYPE "subscription_item_type" ADD VALUE IF NOT EXISTS 'extra_branch';
ALTER TYPE "subscription_item_type" ADD VALUE IF NOT EXISTS 'support_priority';

-- CreateTable
CREATE TABLE "billing_cycles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" "billing_cycle_status" NOT NULL DEFAULT 'pending',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'MXN',
    "due_date" DATE NOT NULL,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_cycle_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "billing_cycle_id" UUID NOT NULL,
    "item_type" VARCHAR(80) NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'MXN',
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_cycle_items_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "saas_payments"
ADD COLUMN "billing_cycle_id" UUID,
ADD COLUMN "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "tax_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "payment_method" VARCHAR(80),
ADD COLUMN "reference" VARCHAR(180),
ADD COLUMN "notes" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "uq_billing_cycle_subscription_period" ON "billing_cycles"("subscription_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "idx_billing_cycles_organization" ON "billing_cycles"("organization_id");

-- CreateIndex
CREATE INDEX "idx_billing_cycles_status" ON "billing_cycles"("status");

-- CreateIndex
CREATE INDEX "idx_billing_cycle_items_cycle" ON "billing_cycle_items"("billing_cycle_id");

-- CreateIndex
CREATE INDEX "idx_saas_payments_billing_cycle" ON "saas_payments"("billing_cycle_id");

-- AddForeignKey
ALTER TABLE "billing_cycles" ADD CONSTRAINT "billing_cycles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "billing_cycles" ADD CONSTRAINT "billing_cycles_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "billing_cycle_items" ADD CONSTRAINT "billing_cycle_items_billing_cycle_id_fkey" FOREIGN KEY ("billing_cycle_id") REFERENCES "billing_cycles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "saas_payments" ADD CONSTRAINT "saas_payments_billing_cycle_id_fkey" FOREIGN KEY ("billing_cycle_id") REFERENCES "billing_cycles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
