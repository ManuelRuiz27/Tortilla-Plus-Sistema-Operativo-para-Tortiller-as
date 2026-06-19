import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from "react";
import { cn } from "../utils/cn";

type OperationalTableProps = TableHTMLAttributes<HTMLTableElement> & {
  children: ReactNode;
  wrapperClassName?: string;
};

export function OperationalTable({ children, className, wrapperClassName, ...props }: OperationalTableProps) {
  return (
    <div className={cn("overflow-x-auto rounded-md border border-tp-border bg-white", wrapperClassName)}>
      <table className={cn("w-full text-left text-sm", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function OperationalTableHead({ children, className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn("bg-tp-mutedSurface text-xs uppercase text-tp-muted", className)} {...props}>
      {children}
    </thead>
  );
}

export function OperationalTableRow({ children, className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("border-t border-tp-border", className)} {...props}>
      {children}
    </tr>
  );
}

