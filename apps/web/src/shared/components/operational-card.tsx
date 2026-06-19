import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

type OperationalCardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  tone?: "default" | "muted" | "dark";
};

const tones = {
  default: "border-tp-border bg-white",
  muted: "border-tp-border bg-tp-surface",
  dark: "border-tp-brandDark bg-tp-brandDark text-white"
};

export function OperationalCard({ children, className, tone = "default", ...props }: OperationalCardProps) {
  return (
    <article className={cn("rounded-md border p-5", tones[tone], className)} {...props}>
      {children}
    </article>
  );
}

