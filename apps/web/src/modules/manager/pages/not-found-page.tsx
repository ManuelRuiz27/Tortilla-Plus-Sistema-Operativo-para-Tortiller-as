import { Link } from "react-router-dom";
import { Button } from "../../../shared/components/button";

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-tp-bg px-6 text-tp-text">
      <section className="max-w-md rounded-md border border-tp-border bg-white p-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">404</p>
        <h1 className="mt-3 text-2xl font-semibold">Ruta no encontrada</h1>
        <p className="mt-3 text-sm text-tp-muted">La pantalla solicitada no existe.</p>
        <Button className="mt-5" variant="secondary">
          <Link to="/app/manager/dashboard">Volver al dashboard</Link>
        </Button>
      </section>
    </main>
  );
}
