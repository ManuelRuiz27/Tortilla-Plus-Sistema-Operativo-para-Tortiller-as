import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { loginRequest } from "../../../api/auth.api";
import { subscriptionFeaturesRequest } from "../../../api/subscriptions.api";
import { Button } from "../../../shared/components/button";
import { useAuthStore } from "../../../shared/stores/auth.store";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { useCashStore } from "../../../shared/stores/cash.store";
import { useSubscriptionStore } from "../../../shared/stores/subscription.store";
import { getPrimaryDestination } from "../../../shared/utils/role";

const loginSchema = z.object({
  email: z.string().email("Captura un correo valido."),
  password: z.string().min(1, "Captura la contrasena.")
});

export function LoginForm() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const setBranches = useBranchStore((state) => state.setBranches);
  const setActiveBranch = useBranchStore((state) => state.setActiveBranch);
  const clearActiveBranch = useBranchStore((state) => state.clearActiveBranch);
  const clearCashSession = useCashStore((state) => state.clearCashSession);
  const setSubscription = useSubscriptionStore((state) => state.setSubscription);
  const [email, setEmail] = useState("owner.demo@tortillaplus.mx");
  const [password, setPassword] = useState("Demo1234!");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = await loginRequest(parsed.data);
      clearActiveBranch();
      clearCashSession();
      login(payload);
      setBranches(payload.user.branches);

      try {
        setSubscription(await subscriptionFeaturesRequest());
      } catch {
        setSubscription({ planCode: "free", status: "active", features: ["pos_basic", "cash_control", "inventory_basic"] });
      }

      if (payload.user.branches.length === 1) {
        setActiveBranch(payload.user.branches[0]);
        navigate(getPrimaryDestination(payload.user), { replace: true });
        return;
      }

      navigate("/app/select-branch", { replace: true });
    } catch {
      setError("No se pudo iniciar sesion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="w-full space-y-5 rounded-md border border-tp-border bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
      <div>
        <h2 className="text-xl font-semibold">Iniciar sesion</h2>
        <p className="mt-1 text-sm text-tp-muted">Usa el correo y contrasena de tu negocio.</p>
      </div>
      <div>
        <label className="text-sm font-semibold" htmlFor="email">
          Correo
        </label>
        <input
          autoComplete="email"
          className="mt-2 h-12 w-full rounded-md border border-tp-border px-3 outline-none focus:border-tp-primary"
          disabled={isSubmitting}
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          value={email}
        />
      </div>
      <div>
        <label className="text-sm font-semibold" htmlFor="password">
          Contrasena
        </label>
        <input
          autoComplete="current-password"
          className="mt-2 h-12 w-full rounded-md border border-tp-border px-3 outline-none focus:border-tp-primary"
          disabled={isSubmitting}
          id="password"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
      </div>
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-tp-danger">{error}</p> : null}
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Entrando..." : "Entrar a mi sucursal"}
      </Button>
    </form>
  );
}
