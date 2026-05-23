import { Lock } from "lucide-react";

type BlockedStateProps = {
  title: string;
  message: string;
};

export function BlockedState({ title, message }: BlockedStateProps) {
  return (
    <div className="flex min-h-72 max-w-xl flex-col justify-center rounded-md border border-tp-border bg-white p-8">
      <Lock className="mb-4 h-8 w-8 text-tp-warning" aria-hidden="true" />
      <h1 className="text-2xl font-semibold text-tp-text">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-tp-muted">{message}</p>
    </div>
  );
}
