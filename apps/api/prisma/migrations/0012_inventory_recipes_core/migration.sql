-- AlterEnum
ALTER TYPE "product_type" ADD VALUE IF NOT EXISTS 'raw_material';
ALTER TYPE "product_type" ADD VALUE IF NOT EXISTS 'packaging';
ALTER TYPE "inventory_movement_type" ADD VALUE IF NOT EXISTS 'production_input_out';

-- CreateEnum
CREATE TYPE "production_mode" AS ENUM ('manual', 'recipe_based');

-- AlterTable
ALTER TABLE "products"
  ADD COLUMN "is_recipe_ingredient" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allow_negative_stock" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "production_batches"
  ADD COLUMN "recipe_version_id" UUID,
  ADD COLUMN "production_mode" "production_mode" NOT NULL DEFAULT 'manual',
  ADD COLUMN "output_product_id" UUID,
  ADD COLUMN "expected_output_quantity" DECIMAL(12,3),
  ADD COLUMN "actual_output_quantity" DECIMAL(12,3),
  ADD COLUMN "output_unit" "product_unit",
  ADD COLUMN "yield_percentage" DECIMAL(6,2),
  ADD COLUMN "variance_reason" TEXT;

-- CreateTable
CREATE TABLE "unit_conversions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "from_unit" VARCHAR(40) NOT NULL,
    "to_unit" "product_unit" NOT NULL,
    "factor" DECIMAL(12,6) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "status" "generic_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "branch_id" UUID,
    "name" VARCHAR(160) NOT NULL,
    "output_product_id" UUID NOT NULL,
    "current_version_id" UUID,
    "status" "generic_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipe_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "expected_output_quantity" DECIMAL(12,3) NOT NULL,
    "output_unit" "product_unit" NOT NULL,
    "notes" TEXT,
    "status" "generic_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipe_version_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" "product_unit" NOT NULL,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "waste_factor" DECIMAL(5,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_batch_ingredients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "production_batch_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "expected_quantity" DECIMAL(12,3) NOT NULL,
    "actual_quantity" DECIMAL(12,3) NOT NULL,
    "unit" "product_unit" NOT NULL,
    "inventory_movement_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_batch_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_unit_conversions_org_product_from_name" ON "unit_conversions"("organization_id", "product_id", "from_unit", "name");

-- CreateIndex
CREATE INDEX "idx_unit_conversions_org" ON "unit_conversions"("organization_id");

-- CreateIndex
CREATE INDEX "idx_unit_conversions_product" ON "unit_conversions"("product_id");

-- CreateIndex
CREATE INDEX "idx_recipes_branch" ON "recipes"("branch_id");

-- CreateIndex
CREATE INDEX "idx_recipes_current_version" ON "recipes"("current_version_id");

-- CreateIndex
CREATE INDEX "idx_recipes_org" ON "recipes"("organization_id");

-- CreateIndex
CREATE INDEX "idx_recipes_output_product" ON "recipes"("output_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_recipe_versions_recipe_version" ON "recipe_versions"("recipe_id", "version");

-- CreateIndex
CREATE INDEX "idx_recipe_versions_recipe" ON "recipe_versions"("recipe_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_recipe_ingredients_version_product" ON "recipe_ingredients"("recipe_version_id", "product_id");

-- CreateIndex
CREATE INDEX "idx_recipe_ingredients_product" ON "recipe_ingredients"("product_id");

-- CreateIndex
CREATE INDEX "idx_production_batches_output_product" ON "production_batches"("output_product_id");

-- CreateIndex
CREATE INDEX "idx_production_batches_recipe_version" ON "production_batches"("recipe_version_id");

-- CreateIndex
CREATE INDEX "idx_production_batch_ingredients_movement" ON "production_batch_ingredients"("inventory_movement_id");

-- CreateIndex
CREATE INDEX "idx_production_batch_ingredients_product" ON "production_batch_ingredients"("product_id");

-- CreateIndex
CREATE INDEX "idx_production_batch_ingredients_batch" ON "production_batch_ingredients"("production_batch_id");

-- AddForeignKey
ALTER TABLE "unit_conversions" ADD CONSTRAINT "unit_conversions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "unit_conversions" ADD CONSTRAINT "unit_conversions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "recipe_versions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_output_product_id_fkey" FOREIGN KEY ("output_product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recipe_versions" ADD CONSTRAINT "recipe_versions_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_version_id_fkey" FOREIGN KEY ("recipe_version_id") REFERENCES "recipe_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_output_product_id_fkey" FOREIGN KEY ("output_product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_recipe_version_id_fkey" FOREIGN KEY ("recipe_version_id") REFERENCES "recipe_versions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "production_batch_ingredients" ADD CONSTRAINT "production_batch_ingredients_inventory_movement_id_fkey" FOREIGN KEY ("inventory_movement_id") REFERENCES "inventory_movements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "production_batch_ingredients" ADD CONSTRAINT "production_batch_ingredients_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "production_batch_ingredients" ADD CONSTRAINT "production_batch_ingredients_production_batch_id_fkey" FOREIGN KEY ("production_batch_id") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
