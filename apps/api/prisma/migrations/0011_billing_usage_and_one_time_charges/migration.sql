-- AlterEnum
ALTER TYPE "saas_payment_status" ADD VALUE IF NOT EXISTS 'partially_applied';

-- CreateEnum
CREATE TYPE "saas_one_time_charge_status" AS ENUM ('pending', 'included_in_cycle', 'cancelled', 'paid');

-- CreateTable
CREATE TABLE "cfdi_usage_counters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "billing_cycle_id" UUID,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "included_limit" INTEGER NOT NULL DEFAULT 0,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "global_invoice_count" INTEGER NOT NULL DEFAULT 0,
    "individual_invoice_count" INTEGER NOT NULL DEFAULT 0,
    "overage_count" INTEGER NOT NULL DEFAULT 0,
    "overage_unit_price" DECIMAL(12,2) NOT NULL DEFAULT 6.00,
    "currency" CHAR(3) NOT NULL DEFAULT 'MXN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cfdi_usage_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_one_time_charges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "subscription_id" UUID,
    "billing_cycle_id" UUID,
    "charge_type" VARCHAR(80) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'MXN',
    "status" "saas_one_time_charge_status" NOT NULL DEFAULT 'pending',
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saas_one_time_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_cfdi_usage_org_period" ON "cfdi_usage_counters"("organization_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "idx_cfdi_usage_billing_cycle" ON "cfdi_usage_counters"("billing_cycle_id");

-- CreateIndex
CREATE INDEX "idx_saas_one_time_charges_org_status" ON "saas_one_time_charges"("organization_id", "status");

-- CreateIndex
CREATE INDEX "idx_saas_one_time_charges_cycle" ON "saas_one_time_charges"("billing_cycle_id");

-- AddForeignKey
ALTER TABLE "cfdi_usage_counters" ADD CONSTRAINT "cfdi_usage_counters_billing_cycle_id_fkey" FOREIGN KEY ("billing_cycle_id") REFERENCES "billing_cycles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cfdi_usage_counters" ADD CONSTRAINT "cfdi_usage_counters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "saas_one_time_charges" ADD CONSTRAINT "saas_one_time_charges_billing_cycle_id_fkey" FOREIGN KEY ("billing_cycle_id") REFERENCES "billing_cycles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "saas_one_time_charges" ADD CONSTRAINT "saas_one_time_charges_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "saas_one_time_charges" ADD CONSTRAINT "saas_one_time_charges_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
