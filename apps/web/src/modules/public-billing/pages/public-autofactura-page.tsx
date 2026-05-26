import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, FileCheck2, ReceiptText } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  publicBillingCatalogsRequest,
  publicReceiptRequest,
  submitPublicInvoiceRequest,
  type PublicInvoiceResult
} from "../../../api/public-billing.api";
import { Button } from "../../../shared/components/button";
import { LoadingState } from "../../../shared/components/loading-state";
import { StatusBadge } from "../../../shared/components/status-badge";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", { currency: "MXN", style: "currency" }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function PublicAutofacturaPage() {
  const { token = "" } = useParams();
  const [result, setResult] = useState<PublicInvoiceResult | null>(null);
  const [form, setForm] = useState({
    rfc: "",
    legalName: "",
    taxRegime: "616",
    zipCode: "",
    cfdiUse: "S01",
    email: ""
  });
  const query = useQuery({
    queryFn: () => publicReceiptRequest(token),
    queryKey: ["public-receipt", token],
    retry: false
  });
  const catalogsQuery = useQuery({
    queryFn: publicBillingCatalogsRequest,
    queryKey: ["public-billing-catalogs"],
    retry: false
  });
  const mutation = useMutation({
    mutationFn: () => submitPublicInvoiceRequest(token, form),
    onSuccess: setResult
  });
  const receipt = query.data;
  const catalogs = catalogsQuery.data;
  const canSubmit = useMemo(() => Boolean(receipt?.canInvoice && !result && !mutation.isPending), [mutation.isPending, receipt?.canInvoice, result]);

  if (query.isLoading || catalogsQuery.isLoading) return <LoadingState message="Cargando ticket..." />;

  if (query.isError || !receipt) {
    return (
      <main className="min-h-screen bg-tp-soft px-4 py-10">
        <section className="mx-auto max-w-xl rounded-md border border-tp-border bg-white p-6">
          <h1 className="text-xl font-semibold">Ticket no encontrado</h1>
          <p className="mt-2 text-sm text-tp-muted">Verifica que el enlace del QR sea correcto.</p>
        </section>
      </main>
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <main className="min-h-screen bg-tp-soft px-4 py-6 sm:py-10">
      <section className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="rounded-md border border-tp-border bg-white p-5">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-tp-primary" aria-hidden="true" />
            <p className="text-sm font-semibold uppercase text-tp-primary">Autofactura</p>
          </div>
          <h1 className="mt-4 text-2xl font-semibold">{receipt.businessName}</h1>
          <p className="mt-1 text-sm text-tp-muted">{receipt.branchName}</p>

          <div className="mt-5 space-y-3 border-y border-tp-border py-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-tp-muted">Ticket</span>
              <strong>{receipt.folio}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-tp-muted">Fecha</span>
              <strong className="text-right">{formatDate(receipt.saleDate)}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-tp-muted">Limite</span>
              <strong className="text-right">{formatDate(receipt.deadline)}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-tp-muted">Estado</span>
              <StatusBadge tone={receipt.canInvoice ? "success" : "warning"}>{receipt.canInvoice ? "Disponible" : "No disponible"}</StatusBadge>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-semibold">Consumo</p>
            <div className="mt-3 space-y-2">
              {receipt.items.map((item) => (
                <div className="flex justify-between gap-3 text-sm" key={`${item.description}-${item.total}`}>
                  <span>{item.description}</span>
                  <span className="font-semibold">{formatMoney(item.total)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between border-t border-tp-border pt-4">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-semibold">{formatMoney(receipt.total)}</span>
            </div>
          </div>
        </aside>

        <section className="rounded-md border border-tp-border bg-white p-5">
          {result || receipt.cfdiUuid ? (
            <div>
              <div className="flex items-center gap-2 text-tp-success">
                <FileCheck2 className="h-5 w-5" aria-hidden="true" />
                <h2 className="text-xl font-semibold">Factura generada</h2>
              </div>
              <p className="mt-2 text-sm text-tp-muted">UUID CFDI: {result?.cfdiUuid ?? receipt.cfdiUuid}</p>
              {result ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  <a className="inline-flex items-center gap-2 rounded-md bg-tp-primary px-4 py-2 text-sm font-semibold text-white" href={result.pdfUrl}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    PDF
                  </a>
                  <a className="inline-flex items-center gap-2 rounded-md border border-tp-border px-4 py-2 text-sm font-semibold text-tp-primary" href={result.xmlUrl}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    XML
                  </a>
                </div>
              ) : null}
            </div>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <div>
                <h2 className="text-xl font-semibold">Datos fiscales</h2>
                <p className="mt-1 text-sm text-tp-muted">Captura los datos tal como aparecen en tu constancia fiscal.</p>
              </div>
              <label className="block text-sm font-semibold">
                RFC
                <input className="mt-1 h-11 w-full rounded-md border border-tp-border px-3 uppercase" maxLength={13} onChange={(event) => setForm({ ...form, rfc: event.target.value.toUpperCase() })} required value={form.rfc} />
              </label>
              <label className="block text-sm font-semibold">
                Razon social
                <input className="mt-1 h-11 w-full rounded-md border border-tp-border px-3 uppercase" onChange={(event) => setForm({ ...form, legalName: event.target.value.toUpperCase() })} required value={form.legalName} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">
                  Regimen fiscal
                  <select className="mt-1 h-11 w-full rounded-md border border-tp-border px-3" onChange={(event) => setForm({ ...form, taxRegime: event.target.value })} required value={form.taxRegime}>
                    {(catalogs?.taxRegimes ?? []).map((item) => (
                      <option key={item.code} value={item.code}>{item.code} - {item.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-semibold">
                  Codigo postal
                  <input className="mt-1 h-11 w-full rounded-md border border-tp-border px-3" inputMode="numeric" maxLength={5} onChange={(event) => setForm({ ...form, zipCode: event.target.value })} required value={form.zipCode} />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">
                  Uso CFDI
                  <select className="mt-1 h-11 w-full rounded-md border border-tp-border px-3" onChange={(event) => setForm({ ...form, cfdiUse: event.target.value })} required value={form.cfdiUse}>
                    {(catalogs?.cfdiUses ?? []).map((item) => (
                      <option key={item.code} value={item.code}>{item.code} - {item.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-semibold">
                  Correo
                  <input className="mt-1 h-11 w-full rounded-md border border-tp-border px-3" onChange={(event) => setForm({ ...form, email: event.target.value })} required type="email" value={form.email} />
                </label>
              </div>
              {mutation.isError ? <p className="rounded-md border border-tp-danger/30 bg-red-50 p-3 text-sm text-tp-danger">No se pudo generar la factura. Revisa los datos e intenta de nuevo.</p> : null}
              <Button className="w-full justify-center" disabled={!canSubmit} type="submit">
                {mutation.isPending ? "Generando..." : "Generar factura"}
              </Button>
            </form>
          )}
        </section>
      </section>
    </main>
  );
}
