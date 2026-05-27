import { LoginForm } from "../components/login-form";

export function LoginPage() {
  return (
    <main className="grid min-h-screen bg-tp-bg px-4 py-6 text-tp-text sm:px-6 lg:px-8">
      <section className="mx-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="max-w-2xl lg:pr-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">
            Tortilla Plus
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
            Todo listo para vender, cobrar y revisar tu caja.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-tp-muted">
            Entra con tu cuenta de la tortilleria y continua la operacion de tu sucursal.
          </p>
        </div>
        <div className="w-full">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
