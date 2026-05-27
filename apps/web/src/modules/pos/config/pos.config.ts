import type { UserRole } from "../../../shared/types/session.types";

export const POS_ALLOWED_ROLES: UserRole[] = [
  "cashier",
  "supervisor",
  "manager",
  "organization_owner"
];

export const POS_PRODUCT_SKUS = {
  tortillaKg: "TORTILLA-KG",
  masaKg: "MASA-KG",
  package800g: "PAQUETE-800G"
} as const;

export const POS_OPERATION_LIMITS = {
  saleMoney: {
    min: 0.01,
    max: 99999.99,
    decimals: 2
  },
  openingCash: {
    min: 0,
    max: 99999.99,
    decimals: 2
  },
  itemKg: {
    min: 0.001,
    max: 999.999,
    decimals: 3
  }
} as const;
