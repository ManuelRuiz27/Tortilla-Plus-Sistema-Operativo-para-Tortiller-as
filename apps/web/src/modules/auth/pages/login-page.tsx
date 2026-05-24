import { LoginForm } from "../components/login-form";

export function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-tp-bg px-4 py-8 text-tp-text">
      <section className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">
            Tortilla Plus
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Todo listo para vender, cobrar y revisar tu caja.
          </h1>
          <p className="mt-4 text-base leading-7 text-tp-muted">
            Entra con tu cuenta de la tortilleria y continua la operacion de tu sucursal.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
