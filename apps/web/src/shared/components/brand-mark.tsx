import { cn } from "../utils/cn";

type BrandMarkProps = {
  className?: string;
  compact?: boolean;
  showByline?: boolean;
};

export function BrandMark({ className, compact = false, showByline = false }: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-tp-brand text-white shadow-sm ring-1 ring-tp-brandDark/10">
        <svg aria-hidden="true" className="h-8 w-8" fill="none" viewBox="0 0 64 64">
          <circle cx="32" cy="32" fill="#F5C76B" r="23" />
          <path
            d="M14 33c8-7 22-9 36-4"
            stroke="#92400E"
            strokeLinecap="round"
            strokeWidth="3.5"
          />
          <path
            d="M20 22c8 2 18 2 28-2"
            stroke="#FFF8E8"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path d="M32 19v26M19 32h26" stroke="#2F6B3F" strokeLinecap="round" strokeWidth="6" />
        </svg>
      </div>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p className="text-base font-extrabold tracking-tight text-tp-text">
            Tortilla <span className="text-tp-brand">Plus</span>
          </p>
          {showByline && <p className="mt-0.5 text-xs font-medium text-tp-muted">by Soft Monkey</p>}
        </div>
      )}
    </div>
  );
}
