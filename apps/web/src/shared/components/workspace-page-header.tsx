type WorkspacePageHeaderProps = {
  className?: string;
  eyebrow: string;
  title: string;
  description?: string;
};

export function WorkspacePageHeader({ className = "mb-6", description, eyebrow, title }: WorkspacePageHeaderProps) {
  return (
    <div className={className}>
      <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">{eyebrow}</p>
      <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
      {description ? <p className="mt-2 max-w-3xl text-sm text-tp-muted">{description}</p> : null}
    </div>
  );
}
