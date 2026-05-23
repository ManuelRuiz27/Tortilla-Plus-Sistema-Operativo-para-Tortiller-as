import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <main className="min-h-screen bg-tp-bg px-6 py-8 text-tp-text">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">
            Tortilla Plus
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Acceso operativo</h1>
        </div>
        <Outlet />
      </div>
    </main>
  );
}
