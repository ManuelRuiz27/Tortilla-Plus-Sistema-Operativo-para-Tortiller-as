import type { ReactNode } from "react";
import { cn } from "../utils/cn";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
};

const tones = {
  success: "bg-green-50 text-tp-success",
  warning: "bg-yellow-50 text-tp-warning",
  danger: "bg-red-50 text-tp-danger",
  info: "bg-blue-50 text-tp-info",
  neutral: "bg-tp-soft text-tp-muted"
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}
