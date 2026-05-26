const statusLabels: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  deleted: "Eliminado",
  open: "Abierto",
  closed: "Cerrado",
  closing: "En cierre",
  pending: "Pendiente",
  authorized: "Autorizado",
  rejected: "Rechazado",
  recorded: "Registrado",
  paid: "Pagado",
  delivered: "Entregado",
  prepared: "Preparado",
  loaded: "Cargado",
  in_route: "En ruta",
  billable: "Por facturar",
  invoiced: "Facturado",
  global_candidate: "Para factura global",
  draft: "Borrador",
  stamped: "Emitida",
  cancelled: "Cancelada",
  error: "Con error",
  not_created: "Sin crear",
  used: "Usado",
  expired: "Vencido",
  free: "Gratis",
  ok: "Bien",
  low: "Bajo",
  negative: "En negativo",
  out: "Agotado",
};

const roleLabels: Record<string, string> = {
  organization_owner: "Dueno",
  manager: "Gerente",
  supervisor: "Supervisor",
  cashier: "Cajero",
  admin: "Administrador",
};

const productTypeLabels: Record<string, string> = {
  tortilla: "Tortilla",
  masa: "Masa",
  package: "Paquete",
  retail: "Mostrador",
  service: "Servicio",
};

const unitLabels: Record<string, string> = {
  kg: "kg",
  piece: "pieza",
  package: "paquete",
  liter: "litro",
  service: "servicio",
};

const saleModeLabels: Record<string, string> = {
  by_kg: "Por kilo",
  by_amount: "Por monto",
  by_package: "Por paquete",
  by_unit: "Por pieza",
};

const featureLabels: Record<string, string> = {
  pos_basic: "Venta en mostrador",
  cash_control: "Control de caja",
  inventory_basic: "Inventario",
  production_control: "Produccion",
  customer_credit: "Credito a clientes",
  billing_cfdi: "Facturas",
  multi_branch: "Varias sucursales",
  delivery_routes: "Reparto",
  reconciliation: "Conciliacion",
  advanced_reports: "Reportes avanzados",
  max_users: "Usuarios incluidos",
  max_branches: "Sucursales incluidas",
  max_pos_devices: "Cajas incluidas",
};

const permissionLabels: Record<string, string> = {
  "sales.create": "Vender",
  "sales.view": "Ver ventas",
  "sales.cancel_before_payment": "Cancelar ventas",
  "sales.cancel_after_payment": "Cancelar ventas cobradas",
  "payments.create": "Cobrar",
  "cash.open": "Abrir caja",
  "cash.close": "Cerrar caja",
  "cash.movements.view": "Ver movimientos de caja",
  "cash.withdraw.request": "Pedir retiros",
  "cash.withdraw.authorize": "Autorizar retiros",
  "inventory.view": "Ver inventario",
  "inventory.manage": "Ajustar inventario",
  "production.manage": "Registrar produccion",
  "products.view": "Ver productos",
  "products.manage": "Editar productos",
  "prices.manage": "Cambiar precios",
  "customers.view": "Ver clientes",
  "customers.manage": "Editar clientes",
  "billing.manage": "Facturar",
  "routes.manage": "Administrar reparto",
  "reports.basic.view": "Ver reportes",
};

const movementLabels: Record<string, string> = {
  cash_in: "Entrada de efectivo",
  cash_out: "Salida de efectivo",
  withdrawal: "Retiro",
  income: "Ingreso",
  sale: "Venta",
  payment: "Pago",
  credit: "Credito",
  debit: "Cargo",
};

export function labelStatus(value?: string | null): string {
  return labelFrom(statusLabels, value);
}

export function labelRole(value?: string | null): string {
  return labelFrom(roleLabels, value);
}

export function labelProductType(value?: string | null): string {
  return labelFrom(productTypeLabels, value);
}

export function labelUnit(value?: string | null): string {
  return labelFrom(unitLabels, value);
}

export function labelSaleMode(value?: string | null): string {
  return labelFrom(saleModeLabels, value);
}

export function labelFeature(value?: string | null): string {
  return labelFrom(featureLabels, value);
}

export function labelPermission(value?: string | null): string {
  return labelFrom(permissionLabels, value);
}

export function labelMovement(value?: string | null): string {
  return labelFrom(movementLabels, value);
}

function labelFrom(labels: Record<string, string>, value?: string | null): string {
  if (!value) {
    return "-";
  }

  return labels[value] ?? value.replace(/[_\.]/g, " ");
}
