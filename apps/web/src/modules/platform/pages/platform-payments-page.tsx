import { useMutation, useQuery } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { ApiErrorException } from "../../../api/api-error";
import { createPlatformManualPaymentRequest, platformOrganizationsRequest, platformPaymentsRequest } from "../../../api/platform.api";
import { queryClient } from "../../../app/query-client";
import { Button } from "../../../shared/components/button";
import { LoadingState } from "../../../shared/components/loading-state";
import { StatusBadge } from "../../../shared/components/status-badge";
import { labelStatus } from "../../../shared/utils/labels";

export function PlatformPaymentsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["platform-payments"], queryFn: platformPaymentsRequest });
  const organizationsQuery = useQuery({ queryKey: ["platform-organizations"], queryFn: platformOrganizationsRequest });
  const organizations = organizationsQuery.data ?? [];
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [note, setNote] = useState("");
  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId]
  );
  const createMutation = useMutation({
    mutationFn: createPlatformManualPaymentRequest,
    onSuccess: () => {
      setAmount("");
      setPaidAt("");
      setNote("");
      void queryClient.invalidateQueries({ queryKey: ["platform-payments"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-organization", selectedOrganizationId] });
    }
  });
  if (isLoading) return <LoadingState message="Cargando pagos..." />;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrganizationId || !selectedOrganization?.subscriptionId) {
      return;
    }
    createMutation.mutate({
      organizationId: selectedOrganizationId,
      subscriptionId: selectedOrganization.subscriptionId,
      amount,
      paidAt: paidAt || undefined,
      note: note || undefined,
      currency: "MXN"
    });
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Pagos SaaS</h1>
      <form className="grid gap-3 rounded-md border border-tp-border bg-white p-4 md:grid-cols-4" onSubmit={submit}>
        <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setSelectedOrganizationId(event.target.value)} required value={selectedOrganizationId}>
          <option value="">Selecciona organizacion</option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>{organization.name}</option>
          ))}
        </select>
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" min="0.01" onChange={(event) => setAmount(event.target.value)} placeholder="Monto" required step="0.01" type="number" value={amount} />
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setPaidAt(event.target.value)} type="date" value={paidAt} />
        <Button disabled={createMutation.isPending || !selectedOrganization?.subscriptionId} type="submit" variant="secondary">
          {createMutation.isPending ? "Registrando..." : "Registrar pago manual"}
        </Button>
        <textarea className="min-h-20 rounded-md border border-tp-border px-3 py-2 text-sm md:col-span-4" onChange={(event) => setNote(event.target.value)} placeholder="Nota opcional" value={note} />
        {createMutation.error instanceof ApiErrorException ? <p className="text-sm text-tp-danger md:col-span-4">{createMutation.error.apiError.message}</p> : null}
      </form>
      <div className="divide-y divide-tp-border rounded-md border border-tp-border bg-white">
        {(data ?? []).map((payment) => (
          <div className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[1fr_120px_120px_160px]" key={payment.id}>
            <span className="font-medium">{payment.organizationName ?? payment.organizationId}</span>
            <span>${Number(payment.amount).toFixed(2)} {payment.currency}</span>
            <StatusBadge tone={payment.status === "approved" ? "success" : "warning"}>{labelStatus(payment.status)}</StatusBadge>
            <span className="text-tp-muted">{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : "Sin fecha"}</span>
          </div>
        ))}
        {!data?.length ? <p className="p-4 text-sm text-tp-muted">Sin pagos registrados.</p> : null}
      </div>
    </div>
  );
}
