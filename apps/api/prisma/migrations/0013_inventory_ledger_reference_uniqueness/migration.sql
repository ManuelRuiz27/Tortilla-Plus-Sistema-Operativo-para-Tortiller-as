-- CreateIndex
CREATE UNIQUE INDEX "uq_inventory_movements_reference_product_type"
ON "inventory_movements"(
  "organization_id",
  "branch_id",
  "product_id",
  "movement_type",
  "reference_type",
  "reference_id"
)
WHERE "reference_type" IS NOT NULL AND "reference_id" IS NOT NULL;
