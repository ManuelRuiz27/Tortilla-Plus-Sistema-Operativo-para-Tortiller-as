import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "../utils/cn";

type AlertTone = "info" | "warning" | "danger" | "success";

type OperationalAlertProps = {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  title: string;
  tone?: AlertTone;
};

const tones: Record<AlertTone, string> = {
  info: "border-blue-100 bg-blue-50 text-tp-info",
  success: "border-green-100 bg-green-50 text-tp-success",
  warning: "border-yellow-200 bg-yellow-50 text-tp-warning",
  danger: "border-red-100 bg-red-50 text-tp-danger"
};

export function OperationalAlert({ action, children, className, title, tone = "info" }: OperationalAlertProps) {
  const Icon = tone === "info" ? Info : tone === "success" ? CheckCircle2 : AlertTriangle;

  return (
    <section className={cn("flex flex-wrap items-start justify-between gap-3 rounded-md border p-4", tones[tone], className)}>
      <div className="flex min-w-0 gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          <div className="mt-1 text-sm text-tp-text">{children}</div>
        </div>
      </div>
      {action}
    </section>
  );
}
