type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = "Cargando..." }: LoadingStateProps) {
  return (
    <div className="grid min-h-48 place-items-center text-sm font-medium text-tp-muted">
      {message}
    </div>
  );
}
