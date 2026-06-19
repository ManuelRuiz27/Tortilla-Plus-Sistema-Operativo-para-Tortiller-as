import { AlertTriangle, LogOut, Search, ShoppingCart, Store, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./button";
import { StatusBadge } from "./status-badge";
import type { CurrentUser } from "../types/session.types";
import { labelRole } from "../utils/labels";

type OperationalHeaderProps = {
  alertCount?: number;
  branchName?: string | null;
  cashStatus?: "open" | "closed" | string | null;
  compact?: boolean;
  contextLabel?: string;
  onLogout: () => void;
  showAlerts?: boolean;
  showSearch?: boolean;
  showPosShortcut?: boolean;
  user?: CurrentUser | null;
};

function primaryRole(user?: CurrentUser | null) {
  return user?.roles[0] ? labelRole(user.roles[0]) : "Rol sin asignar";
}

function cashLabel(cashStatus?: string | null) {
  return cashStatus === "open" ? "Caja abierta" : "Caja cerrada";
}

export function OperationalHeader({
  alertCount = 0,
  branchName,
  cashStatus,
  compact = false,
  contextLabel = "Operacion",
  onLogout,
  showAlerts = true,
  showSearch = true,
  showPosShortcut = true,
  user
}: OperationalHeaderProps) {
  const isCashOpen = cashStatus === "open";

  return (
    <header className="border-b border-tp-border bg-white px-4 py-3 lg:px-6">
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-tp-brandDark text-white">
              <Store className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{branchName ?? "Sucursal sin seleccionar"}</p>
              <p className="truncate text-xs text-tp-muted">{contextLabel}</p>
            </div>
          </div>

          <StatusBadge tone={isCashOpen ? "success" : "warning"}>{cashLabel(cashStatus)}</StatusBadge>

          {!compact ? (
            <span className="inline-flex min-h-8 items-center gap-2 rounded-md border border-tp-border bg-tp-surface px-2.5 text-xs font-semibold text-tp-muted">
              <UserRound className="h-3.5 w-3.5 text-tp-primary" aria-hidden="true" />
              <span className="max-w-40 truncate">{user?.fullName ?? "Usuario"}</span>
              <span className="text-tp-border">|</span>
              <span>{primaryRole(user)}</span>
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          {!compact && showSearch ? (
            <button
              className="hidden min-h-10 min-w-56 items-center justify-between gap-3 rounded-md border border-tp-border bg-tp-surface px-3 text-sm text-tp-muted transition hover:border-tp-primary hover:text-tp-text md:inline-flex"
              type="button"
            >
              <span className="inline-flex items-center gap-2">
                <Search className="h-4 w-4" aria-hidden="true" />
                Buscar
              </span>
              <kbd className="rounded border border-tp-border bg-white px-1.5 py-0.5 text-[11px] font-semibold">Ctrl K</kbd>
            </button>
          ) : null}

          {!compact && showAlerts ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-tp-border bg-white px-4 py-2 text-sm font-semibold text-tp-text transition hover:bg-tp-soft"
              to="/app/alerts"
            >
              <AlertTriangle className="h-4 w-4 text-tp-warning" aria-hidden="true" />
              Alertas {alertCount}
            </Link>
          ) : null}

          {showPosShortcut ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-tp-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-tp-primaryHover"
              to="/app/pos/sale"
            >
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                POS
            </Link>
          ) : null}

          <Button variant="ghost" onClick={onLogout}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Salir
          </Button>
        </div>
      </div>
    </header>
  );
}
