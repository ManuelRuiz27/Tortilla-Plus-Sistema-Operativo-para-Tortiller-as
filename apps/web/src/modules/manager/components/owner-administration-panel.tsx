import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, MonitorSmartphone, UserPlus } from "lucide-react";
import { useState } from "react";
import {
  createOrganizationBranchRequest,
  createOrganizationPosDeviceRequest,
  createOrganizationUserRequest,
  organizationBillingSummaryRequest,
  organizationSummaryRequest,
  resetOrganizationUserPinRequest,
  updateOrganizationUserStatusRequest
} from "../../../api/organization.api";
import { Button } from "../../../shared/components/button";
import { LoadingState } from "../../../shared/components/loading-state";
import { StatusBadge } from "../../../shared/components/status-badge";
import { labelRole, labelStatus } from "../../../shared/utils/labels";

type UserRoleInput = "manager" | "supervisor" | "cashier";

export function OwnerAdministrationPanel() {
  const queryClient = useQueryClient();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userPin, setUserPin] = useState("");
  const [userRole, setUserRole] = useState<UserRoleInput>("manager");
  const [userBranchId, setUserBranchId] = useState("");
  const [resetPin, setResetPin] = useState("");
  const [branchName, setBranchName] = useState("");
  const [posName, setPosName] = useState("");
  const [posBranchId, setPosBranchId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const { data, isError, isLoading } = useQuery({
    queryFn: organizationSummaryRequest,
    queryKey: ["organization-summary"]
  });
  const billingQuery = useQuery({
    queryFn: organizationBillingSummaryRequest,
    queryKey: ["organization-billing-summary"]
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["organization-summary"] });
  const createUserMutation = useMutation({
    mutationFn: createOrganizationUserRequest,
    onSuccess: () => {
      setUserName("");
      setUserEmail("");
      setUserPassword("");
      setUserPin("");
      setMessage("Usuario creado.");
      refresh();
    }
  });
  const createBranchMutation = useMutation({
    mutationFn: createOrganizationBranchRequest,
    onSuccess: () => {
      setBranchName("");
      refresh();
    }
  });
  const createPosMutation = useMutation({
    mutationFn: createOrganizationPosDeviceRequest,
    onSuccess: () => {
      setPosName("");
      refresh();
    }
  });
  const statusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: "active" | "inactive" }) =>
      updateOrganizationUserStatusRequest(userId, status),
    onSuccess: refresh
  });
  const resetPinMutation = useMutation({
    mutationFn: (userId: string) => resetOrganizationUserPinRequest(userId, resetPin || undefined),
    onSuccess: (result) => setMessage(`PIN temporal actualizado: ${result.temporaryPin}`)
  });

  if (isLoading) return <LoadingState message="Cargando administracion..." />;
  if (isError || !data) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudo cargar la administracion del negocio.</p>;

  const branches = data.branches.filter((branch) => branch.status === "active");
  const billing = billingQuery.data;
  const selectedUserBranchId = userBranchId || branches[0]?.id || "";
  const selectedPosBranchId = posBranchId || branches[0]?.id || "";

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <article className="rounded-md border border-tp-border bg-white p-5 xl:col-span-2">
        <h2 className="text-sm font-semibold">Organizacion</h2>
        <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
          <p><span className="text-tp-muted">Nombre:</span> {data.name}</p>
          <p><span className="text-tp-muted">RFC:</span> {data.taxId ?? "-"}</p>
          <p><span className="text-tp-muted">Plan:</span> {data.subscription?.planName ?? "-"}</p>
          <p><span className="text-tp-muted">Estado:</span> {labelStatus(data.status)}</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <ReadOnlyMetric label="Estado de pago" value={labelStatus(billing?.currentCycle?.status ?? data.subscription?.status ?? "sin_corte")} />
          <ReadOnlyMetric label="Vencimiento" value={billing?.currentCycle?.dueDate ? new Date(billing.currentCycle.dueDate).toLocaleDateString() : "-"} />
          <ReadOnlyMetric label="Deuda pendiente" value={formatMoney(billing?.pendingBalance ?? "0.00")} />
          <ReadOnlyMetric label="Total corte" value={formatMoney(billing?.currentCycle?.total ?? "0.00")} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <LimitMetric label="Sucursales" used={billing?.usage.branches ?? branches.length} limit={billing?.limits.branches ?? 0} />
          <LimitMetric label="POS" used={billing?.usage.licensedPos ?? data.posDevices.filter((device) => device.licensed).length} limit={billing?.limits.pos ?? 0} />
          <LimitMetric label="Terminales" used={billing?.usage.terminals ?? 0} limit={billing?.limits.terminals ?? 0} />
          <LimitMetric label="CFDI" used={billing?.usage.cfdi ?? 0} limit={billing?.limits.cfdi ?? 0} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ReadOnlyMetric label="CFDI globales" value={String(billing?.cfdiUsage.globalInvoiceCount ?? 0)} />
          <ReadOnlyMetric label="CFDI individuales" value={String(billing?.cfdiUsage.individualInvoiceCount ?? 0)} />
          <ReadOnlyMetric label="Excedente estimado" value={formatMoney(billing?.cfdiUsage.overageTotal ?? "0.00")} />
        </div>
        {message ? <p className="mt-4 rounded-md bg-tp-soft p-3 text-sm">{message}</p> : null}
      </article>

      <article className="rounded-md border border-tp-border bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Usuarios</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setUserName(event.target.value)} placeholder="Nombre" value={userName} />
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setUserEmail(event.target.value)} placeholder="correo@negocio.mx" type="email" value={userEmail} />
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setUserPassword(event.target.value)} placeholder="Contrasena temporal" type="password" value={userPassword} />
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setUserPin(event.target.value)} placeholder="PIN" value={userPin} />
          <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setUserRole(event.target.value as UserRoleInput)} value={userRole}>
            <option value="manager">Gerente</option>
            <option value="supervisor">Supervisor</option>
            <option value="cashier">Cajero</option>
          </select>
          <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setUserBranchId(event.target.value)} value={selectedUserBranchId}>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            disabled={!userName || !userEmail || !userPassword || !userPin || !selectedUserBranchId || createUserMutation.isPending}
            onClick={() => createUserMutation.mutate({ name: userName, email: userEmail, role: userRole, branchId: selectedUserBranchId, password: userPassword, pin: userPin })}
          >
            Crear usuario
          </Button>
        </div>
        <div className="mt-4">
          <input className="h-11 w-full rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setResetPin(event.target.value)} placeholder="PIN para reset" value={resetPin} />
        </div>
        <div className="mt-5 space-y-3">
          {data.users.map((user) => (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tp-border pt-3 first:border-t-0 first:pt-0" key={user.id}>
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-xs text-tp-muted">{user.email}</p>
                <p className="text-xs text-tp-muted">{user.roles.map(labelRole).join(", ")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={user.status === "active" ? "success" : "warning"}>{labelStatus(user.status)}</StatusBadge>
                <Button onClick={() => resetPinMutation.mutate(user.id)} variant="secondary">Reset PIN</Button>
                <Button
                  onClick={() => statusMutation.mutate({ userId: user.id, status: user.status === "active" ? "inactive" : "active" })}
                  variant="secondary"
                >
                  {user.status === "active" ? "Desactivar" : "Activar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-md border border-tp-border bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Sucursales</h2>
        </div>
        <div className="flex gap-2">
          <input className="h-11 min-w-0 flex-1 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setBranchName(event.target.value)} placeholder="Nueva sucursal" value={branchName} />
          <Button disabled={!branchName || createBranchMutation.isPending} onClick={() => createBranchMutation.mutate({ name: branchName })}>Crear</Button>
        </div>
        <div className="mt-5 space-y-3">
          {data.branches.map((branch) => (
            <div className="flex items-center justify-between border-t border-tp-border pt-3 first:border-t-0 first:pt-0" key={branch.id}>
              <p className="font-semibold">{branch.name}</p>
              <StatusBadge tone={branch.status === "active" ? "success" : "warning"}>{labelStatus(branch.status)}</StatusBadge>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-md border border-tp-border bg-white p-5 xl:col-span-2">
        <div className="mb-4 flex items-center gap-2">
          <MonitorSmartphone className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
          <h2 className="text-sm font-semibold">POS internos</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_240px_auto]">
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setPosName(event.target.value)} placeholder="Nombre de caja" value={posName} />
          <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setPosBranchId(event.target.value)} value={selectedPosBranchId}>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <Button disabled={!posName || !selectedPosBranchId || createPosMutation.isPending} onClick={() => createPosMutation.mutate({ name: posName, branchId: selectedPosBranchId })}>Crear POS</Button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {data.posDevices.map((device) => (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-tp-border p-3" key={device.id}>
              <div>
                <p className="font-semibold">{device.name}</p>
                <p className="text-xs text-tp-muted">{device.branchName ?? "Sin sucursal"} | {device.code}</p>
              </div>
              <div className="flex gap-2">
                <StatusBadge tone={device.status === "active" ? "success" : "warning"}>{labelStatus(device.status)}</StatusBadge>
                <StatusBadge tone={device.licensed ? "success" : "warning"}>{device.licensed ? "Licenciado" : "Sin licencia"}</StatusBadge>
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

function ReadOnlyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-tp-soft p-3 text-sm">
      <p className="text-tp-muted">{label}</p>
      <p className="mt-1 font-semibold text-tp-text">{value}</p>
    </div>
  );
}

function LimitMetric({ label, used, limit }: { label: string; used: number; limit: number }) {
  return <ReadOnlyMetric label={label} value={`${used} / ${limit}`} />;
}

function formatMoney(value: string | number) {
  return Number(value).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}
