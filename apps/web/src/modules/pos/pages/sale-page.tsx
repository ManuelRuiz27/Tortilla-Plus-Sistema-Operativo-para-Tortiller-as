import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, Scale, Wheat } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ApiErrorException } from "../../../api/api-error";
import { managerCustomersRequest, mercadoPagoTerminalsRequest, operationalPosDevicesRequest } from "../../../api/manager.api";
import {
  cancelDraftSaleRequest,
  cancelTerminalOrderRequest,
  confirmTerminalOrderCheckoutRequest,
  createTerminalOrderRequest,
  checkoutSaleRequest,
  openTerminalOrderRequest,
  terminalOrderStatusRequest,
  quoteSaleRequest
} from "../../../api/sales.api";
import { Button } from "../../../shared/components/button";
import { LoadingState } from "../../../shared/components/loading-state";
import { useAuthStore } from "../../../shared/stores/auth.store";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { usePosDeviceStore } from "../../../shared/stores/pos-device.store";
import { createId } from "../../../shared/utils/id";
import { CartPanel } from "../components/cart-panel";
import { CustomerSelector } from "../components/customer-selector";
import { PackageQuickButton } from "../components/package-quick-button";
import { PaymentModal } from "../components/payment-modal";
import { PosErrorAlert } from "../components/pos-error-alert";
import { ProductSaleModal } from "../components/product-sale-modal";
import { ProductQuickGrid } from "../components/product-quick-grid";
import { SaleSuccessModal } from "../components/sale-success-modal";
import { getProductPrice, usePosProducts } from "../hooks/use-pos-products";
import { usePosCartStore } from "../stores/pos-cart.store";
import type { CompletedSale, PosPayment, TerminalOrder } from "../types/payment.types";
import type { PosCartItem, PosProduct, PosSaleMode } from "../types/pos.types";
import { formatMoney } from "../utils/money";

type CheckoutDraft = {
  items: PosCartItem[];
  total: number;
  idempotencyKey: string;
  clientGeneratedId: string;
};

type QuickSaleProduct = {
  product: PosProduct | null;
  pricePerKg: number;
  initialMode: Extract<PosSaleMode, "by_kg" | "by_amount">;
};

function calculateCartTotal(items: PosCartItem[]): number {
  return Number(items.reduce((sum, item) => sum + item.total, 0).toFixed(2));
}

function terminalErrorMessage(error: unknown): string {
  if (!(error instanceof ApiErrorException)) {
    return "No se pudo completar la operacion con terminal.";
  }

  const messages: Record<string, string> = {
    POS_DEVICE_REQUIRED: "Selecciona la caja/POS antes de cobrar con Mercado Pago.",
    TERMINAL_NOT_ASSIGNED: "Esta caja no tiene terminal Mercado Pago asignada.",
    MP_STORE_NOT_CONFIGURED: "La sucursal no tiene Store Mercado Pago configurado.",
    MP_POS_NOT_CONFIGURED: "La caja no tiene POS Mercado Pago configurado.",
    TERMINAL_STORE_MISMATCH: "La terminal esta asociada a otra sucursal Mercado Pago.",
    TERMINAL_POS_MISMATCH: "La terminal esta asociada a otro POS Mercado Pago.",
    TERMINAL_NOT_PDV: "La terminal no esta en modo PDV. Configurala en Mercado Pago Point antes de cobrar.",
    MERCADOPAGO_NOT_CONNECTED: "Mercado Pago no esta conectado para esta organizacion.",
    MERCADOPAGO_CONNECTION_INACTIVE: "La conexion de Mercado Pago no esta activa.",
    TERMINAL_PAYMENT_NOT_APPROVED: "El pago aun no esta aprobado en la terminal.",
    TERMINAL_ORDER_ALREADY_CHECKED_OUT: "Esta orden ya fue usada en una venta.",
    TERMINAL_PAYMENT_AMOUNT_MISMATCH: "El monto aprobado en terminal no coincide con la venta.",
    MERCADOPAGO_POINT_CREATE_FAILED: "Mercado Pago rechazo la orden. Revisa terminal, modo PDV y cuenta vinculada."
  };

  return messages[error.apiError.error] ?? error.apiError.message;
}

export function SalePage() {
  const [searchParams] = useSearchParams();
  const branchId = useBranchStore((state) => state.activeBranchId);
  const {
    isError,
    isLoading,
    masaProduct,
    package800gProduct,
    retailProducts,
    tortillaProduct
  } = usePosProducts(branchId);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft | null>(null);
  const [terminalOrder, setTerminalOrder] = useState<TerminalOrder | null>(null);
  const [terminalError, setTerminalError] = useState<string | null>(null);
  const [quickSaleProduct, setQuickSaleProduct] = useState<QuickSaleProduct | null>(null);
  const user = useAuthStore((state) => state.user);
  const activePosDeviceId = usePosDeviceStore((state) => state.activePosDeviceId);
  const activePosDeviceName = usePosDeviceStore((state) => state.activePosDeviceName);
  const setActivePosDevice = usePosDeviceStore((state) => state.setActivePosDevice);
  const clearActivePosDevice = usePosDeviceStore((state) => state.clearActivePosDevice);
  const items = usePosCartStore((state) => state.items);
  const subtotal = usePosCartStore((state) => state.subtotal);
  const total = usePosCartStore((state) => state.total);
  const addItem = usePosCartStore((state) => state.addItem);
  const removeItem = usePosCartStore((state) => state.removeItem);
  const setItems = usePosCartStore((state) => state.setItems);
  const clearCart = usePosCartStore((state) => state.clearCart);
  const saleDraftId = usePosCartStore((state) => state.saleDraftId);
  const clearSaleDraftId = usePosCartStore((state) => state.clearSaleDraftId);
  const selectedCustomer = usePosCartStore((state) => state.selectedCustomer);
  const setSelectedCustomer = usePosCartStore((state) => state.setSelectedCustomer);
  const clearSelectedCustomer = usePosCartStore((state) => state.clearSelectedCustomer);
  const queryCustomerId = searchParams.get("customerId");
  const customersQuery = useQuery({
    enabled: Boolean(queryCustomerId),
    queryFn: managerCustomersRequest,
    queryKey: ["manager-customers"]
  });
  const terminalsQuery = useQuery({
    enabled: Boolean(branchId),
    queryFn: () => mercadoPagoTerminalsRequest(branchId),
    queryKey: ["mercadopago-terminals", branchId]
  });
  const posDevicesQuery = useQuery({
    enabled: Boolean(branchId),
    queryFn: () => operationalPosDevicesRequest(branchId ?? ""),
    queryKey: ["pos-devices", branchId]
  });
  const openTerminalOrderQuery = useQuery({
    enabled: Boolean(branchId && activePosDeviceId),
    queryFn: () => openTerminalOrderRequest({ branchId: branchId ?? "", posDeviceId: activePosDeviceId ?? "" }),
    queryKey: ["mercadopago-open-terminal-order", branchId, activePosDeviceId],
    refetchOnWindowFocus: false
  });
  const assignedTerminal = terminalsQuery.data?.find(
    (terminal) =>
      terminal.binding?.status === "active" &&
      terminal.binding.posDeviceId === activePosDeviceId
  ) ?? null;
  const mercadoPagoDisabledReason = !activePosDeviceId
    ? "Selecciona la caja/POS antes de cobrar con Mercado Pago."
    : !assignedTerminal
      ? "Esta caja no tiene terminal Mercado Pago asignada."
      : !assignedTerminal.mpStoreId && !assignedTerminal.externalStoreId
        ? "La terminal no tiene Store Mercado Pago configurado."
        : !assignedTerminal.mpPosId && !assignedTerminal.externalPosId
          ? "La terminal no tiene POS Mercado Pago configurado."
          : assignedTerminal.operatingMode && assignedTerminal.operatingMode !== "PDV"
            ? "La terminal no esta en modo PDV. Configurala en Mercado Pago Point antes de cobrar."
            : null;
  const autoConfirmTerminalPayment = import.meta.env.VITE_POS_AUTO_CONFIRM_TERMINAL_PAYMENT !== "false";
  const tortillaKgPrice = tortillaProduct ? getProductPrice(tortillaProduct, "by_kg") : 0;
  const masaKgPrice = masaProduct ? getProductPrice(masaProduct, "by_kg") : 0;
  const packagePrice = package800gProduct ? getProductPrice(package800gProduct, "by_package") : 0;
  const checkoutMutation = useMutation({
    mutationFn: async (payload: { payments: PosPayment[]; changeAmount?: number; authorizationPin?: string }) => {
      if (!branchId) {
        throw new Error("Sucursal no seleccionada.");
      }

      const checkoutItems = checkoutDraft?.items ?? items;
      return checkoutSaleRequest({
        branchId,
        customerId: selectedCustomer?.id,
        items: checkoutItems,
        payments: payload.payments,
        authorizationPin: payload.authorizationPin,
        clientGeneratedId: checkoutDraft?.clientGeneratedId
      }, checkoutDraft?.idempotencyKey ?? createId());
    },
    onError: (error) => {
      if (error instanceof ApiErrorException) {
        setPaymentError(error.apiError.message);
        return;
      }

      setPaymentError("No se pudo completar la venta.");
    },
    onSuccess: (sale) => {
      clearCart();
      clearSaleDraftId();
      clearSelectedCustomer();
      setCheckoutDraft(null);
      setPaymentError(null);
      setIsPaymentOpen(false);
      setCompletedSale(sale);
    }
  });
  const cancelDraftMutation = useMutation({
    mutationFn: async () => {
      if (saleDraftId) {
        await cancelDraftSaleRequest(saleDraftId);
      }
    },
    onSuccess: () => {
      clearCart();
      clearSaleDraftId();
      clearSelectedCustomer();
      setCheckoutDraft(null);
      setIsPaymentOpen(false);
      setPaymentError(null);
    }
  });
  const createTerminalOrderMutation = useMutation({
    mutationFn: async (payload: { amount: string; payments?: PosPayment[]; authorizationPin?: string }) => {
      if (!branchId) {
        throw new Error("Sucursal no seleccionada.");
      }
      if (!activePosDeviceId) {
        throw new Error("Selecciona la caja/POS antes de cobrar con Mercado Pago.");
      }
      if (mercadoPagoDisabledReason) {
        throw new Error(mercadoPagoDisabledReason);
      }
      const checkoutItems = checkoutDraft?.items ?? items;
      return createTerminalOrderRequest({
        branchId,
        posDeviceId: activePosDeviceId,
        amount: payload.amount,
        saleDraft: {
          customerId: selectedCustomer?.id,
          clientGeneratedId: checkoutDraft?.clientGeneratedId,
          items: checkoutItems
        },
        payments: payload.payments,
        authorizationPin: payload.authorizationPin
      }, createId());
    },
    onError: (error) => {
      setTerminalError(error instanceof Error && !(error instanceof ApiErrorException) ? error.message : terminalErrorMessage(error));
    },
    onSuccess: (order) => {
      setTerminalError(null);
      setTerminalOrder(order);
    }
  });
  const confirmTerminalCheckoutMutation = useMutation({
    mutationFn: (orderId: string) => confirmTerminalOrderCheckoutRequest(orderId, createId()),
    onError: (error) => {
      setTerminalError(terminalErrorMessage(error));
    },
    onSuccess: (sale) => {
      clearCart();
      clearSaleDraftId();
      clearSelectedCustomer();
      setCheckoutDraft(null);
      setTerminalOrder(null);
      setTerminalError(null);
      setIsPaymentOpen(false);
      setCompletedSale(sale);
    }
  });
  const cancelTerminalOrderMutation = useMutation({
    mutationFn: (orderId: string) => cancelTerminalOrderRequest(orderId, createId()),
    onError: (error) => setTerminalError(terminalErrorMessage(error)),
    onSuccess: setTerminalOrder
  });

  function handlePosDeviceChange(posDeviceId: string) {
    const device = posDevicesQuery.data?.find((item) => item.id === posDeviceId);
    if (!device) {
      clearActivePosDevice();
      return;
    }

    setActivePosDevice({ id: device.id, name: device.name });
    setTerminalError(null);
  }

  async function applyQuote(nextItems: PosCartItem[], customer = selectedCustomer, failOnError = false): Promise<PosCartItem[]> {
    if (!branchId || nextItems.length === 0) {
      setItems(nextItems);
      return nextItems;
    }

    setIsQuoting(true);
    setQuoteError(null);
    try {
      const quote = await quoteSaleRequest({
        branchId,
        customerId: customer?.id,
        items: nextItems
      });
      const quotedItems = quote.items.map((item, index) => ({
        ...nextItems[index],
        productName: item.productName,
        productType: item.productType,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
        priceSource: item.priceSource,
        priceSourceLabel: item.priceSource === "customer" ? "Precio cliente" : "Precio sucursal"
      }));
      setItems(quotedItems);
      return quotedItems;
    } catch (error) {
      setItems(nextItems);
      setQuoteError(error instanceof ApiErrorException ? error.apiError.message : "No se pudo cotizar la venta.");
      if (failOnError) {
        throw error;
      }
      return nextItems;
    } finally {
      setIsQuoting(false);
    }
  }

  function handleAddItem(item: PosCartItem) {
    const nextItems = [...items, item];
    addItem(item);
    void applyQuote(nextItems);
  }

  function handleRemoveItem(localId: string) {
    const nextItems = items.filter((item) => item.localId !== localId);
    removeItem(localId);
    void applyQuote(nextItems);
  }

  function handleUpdateQuantity(localId: string, quantity: number) {
    const target = items.find((item) => item.localId === localId);
    if (
      target?.productType === "retail" &&
      target.currentStock !== undefined &&
      quantity > target.currentStock
    ) {
      setQuoteError("Stock insuficiente para producto retail.");
      return;
    }

    const nextItems = items.map((item) =>
      item.localId === localId
        ? {
            ...item,
            quantity,
            total: Number((item.unitPrice * quantity).toFixed(2))
          }
        : item
    );
    setItems(nextItems);
    void applyQuote(nextItems);
  }

  async function handleCheckout() {
    if (items.length > 0 && total > 0 && !checkoutMutation.isPending && !isQuoting) {
      try {
        const quotedItems = await applyQuote(items, selectedCustomer, true);
        setCheckoutDraft({
          items: quotedItems,
          total: calculateCartTotal(quotedItems),
          idempotencyKey: createId(),
          clientGeneratedId: createId()
        });
        setIsPaymentOpen(true);
      } catch {
        setIsPaymentOpen(false);
      }
    }
  }

  function handleNewSale() {
    setCompletedSale(null);
    clearSelectedCustomer();
    document.getElementById("tortilla-kg-input")?.focus();
  }

  function handleCancelTicket() {
    if (items.length === 0 || !window.confirm("Cancelar esta venta?")) {
      return;
    }

    cancelDraftMutation.mutate();
  }

  function handleClearCart() {
    clearCart();
    clearSelectedCustomer();
    setCheckoutDraft(null);
    setQuoteError(null);
    setTerminalOrder(null);
    setTerminalError(null);
  }

  function openQuickSale(
    product: PosProduct | null,
    pricePerKg: number,
    initialMode: Extract<PosSaleMode, "by_kg" | "by_amount"> = "by_kg"
  ) {
    if (!product || pricePerKg <= 0) {
      return;
    }

    setQuickSaleProduct({ product, pricePerKg, initialMode });
  }

  function focusInput(id: string) {
    document.getElementById(id)?.focus();
  }

  function handleSelectCustomer(customer: NonNullable<typeof selectedCustomer>) {
    setSelectedCustomer(customer);
    if (items.length > 0) {
      void applyQuote(items, customer);
    }
  }

  function handleClearCustomer() {
    clearSelectedCustomer();
    if (items.length > 0) {
      void applyQuote(items, null);
    }
  }

  useEffect(() => {
    if (
      !terminalOrder ||
      ["approved", "rejected", "expired", "canceled", "failed", "refunded"].includes(terminalOrder.status)
    ) {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const next = await terminalOrderStatusRequest(terminalOrder.id);
        setTerminalOrder(next);
        if (next.status === "approved" && autoConfirmTerminalPayment) {
          confirmTerminalCheckoutMutation.mutate(next.id);
        }
      } catch (error) {
        setTerminalError(terminalErrorMessage(error));
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [autoConfirmTerminalPayment, confirmTerminalCheckoutMutation, terminalOrder]);

  useEffect(() => {
    const openOrder = openTerminalOrderQuery.data;
    if (!openOrder || terminalOrder?.id === openOrder.id) {
      return;
    }

    setTerminalOrder(openOrder);
    setTerminalError(null);
    setIsPaymentOpen(false);
  }, [openTerminalOrderQuery.data, terminalOrder?.id]);

  useEffect(() => {
    if (!activePosDeviceId || !posDevicesQuery.data) {
      return;
    }

    const device = posDevicesQuery.data.find((item) => item.id === activePosDeviceId);
    if (!device || device.branchId !== branchId) {
      clearActivePosDevice();
    }
  }, [activePosDeviceId, branchId, clearActivePosDevice, posDevicesQuery.data]);

  useEffect(() => {
    if (!queryCustomerId || !customersQuery.data || selectedCustomer?.id === queryCustomerId) {
      return;
    }

    const customer = customersQuery.data.find((item) => item.id === queryCustomerId);
    if (customer?.status === "active") {
      setSelectedCustomer(customer);
      return;
    }

    clearSelectedCustomer();
    setQuoteError("Cliente no encontrado o inactivo. La venta continua como publico general.");
  }, [clearSelectedCustomer, customersQuery.data, queryCustomerId, selectedCustomer?.id, setSelectedCustomer]);

  useEffect(() => {
    if (!queryCustomerId || !customersQuery.isError) {
      return;
    }

    clearSelectedCustomer();
    setQuoteError("No se pudo validar el cliente. La venta continua como publico general.");
  }, [clearSelectedCustomer, customersQuery.isError, queryCustomerId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      if (event.key === "F6" || event.ctrlKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        focusInput("product-search");
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        if (quickSaleProduct) {
          setQuickSaleProduct(null);
          return;
        }
        if (isPaymentOpen) {
          setCheckoutDraft(null);
          setIsPaymentOpen(false);
          return;
        }
        handleCancelTicket();
        return;
      }

      const shortcutMap: Record<string, () => void> = {
        F1: () => openQuickSale(tortillaProduct, tortillaKgPrice, "by_kg"),
        F2: () => openQuickSale(tortillaProduct, tortillaKgPrice, "by_amount"),
        F3: () => openQuickSale(masaProduct, masaKgPrice, "by_kg"),
        F4: () => openQuickSale(masaProduct, masaKgPrice, "by_amount"),
        F5: () => document.getElementById("package-800-button")?.click(),
        F9: () => void handleCheckout()
      };

      const action = shortcutMap[event.key];
      if (action) {
        event.preventDefault();
        action();
        return;
      }

      if (isTyping) {
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [checkoutMutation.isPending, isPaymentOpen, items.length, masaKgPrice, masaProduct, quickSaleProduct, saleDraftId, tortillaKgPrice, tortillaProduct, total]);

  if (isLoading) {
    return <LoadingState message="Cargando productos..." />;
  }

  if (isError) {
    return (
      <div className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">
        No se pudieron cargar los productos.
      </div>
    );
  }

  return (
    <section className="grid min-h-[calc(100vh-7rem)] gap-5 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0">
        <div className="rounded-md border border-tp-border bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Venta en mostrador</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Nueva venta</h1>
              <p className="mt-1 text-sm text-tp-muted">Agrega tortillas, masa, paquetes o productos de mostrador.</p>
            </div>
            <label className="w-full text-sm font-semibold sm:w-64">
              Caja/POS
              <select
                className="mt-2 h-11 w-full rounded-md border border-tp-border px-3 outline-none focus:border-tp-primary"
                disabled={!branchId || posDevicesQuery.isLoading}
                onChange={(event) => handlePosDeviceChange(event.target.value)}
                value={activePosDeviceId ?? ""}
              >
                <option value="">Selecciona caja</option>
                {(posDevicesQuery.data ?? []).map((device) => (
                  <option key={device.id} value={device.id}>{device.name}</option>
                ))}
              </select>
            </label>
          </div>
          {activePosDeviceName ? (
            <p className="mt-3 text-xs text-tp-muted">Caja activa: {activePosDeviceName}</p>
          ) : (
            <p className="mt-3 text-xs text-tp-danger">Selecciona una caja para habilitar cobros Mercado Pago.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-tp-muted">
            {["F1 Tortilla kg", "F2 Tortilla $", "F3 Masa kg", "F4 Masa $", "F5 Paquete", "F6 Buscar", "F9 Cobrar", "Esc Cancelar"].map((shortcut) => (
              <span className="rounded-md border border-tp-border bg-tp-surface px-2 py-1" key={shortcut}>{shortcut}</span>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <CustomerSelector
            onClear={handleClearCustomer}
            onSelect={handleSelectCustomer}
            selectedCustomer={selectedCustomer}
          />
        </div>

        <div className="mt-5">
          <h2 className="text-sm font-semibold">Productos principales</h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Button
              className="min-h-24 justify-start px-5 text-left"
              disabled={!tortillaProduct || tortillaKgPrice <= 0}
              onClick={() => openQuickSale(tortillaProduct, tortillaKgPrice)}
              variant="secondary"
            >
              <Wheat className="h-5 w-5" aria-hidden="true" />
              <span>
                Tortilla
                <span className="block text-xs font-medium text-tp-muted">
                  F1 kg - F2 $ - {formatMoney(tortillaKgPrice)}/kg
                </span>
              </span>
            </Button>
            <Button
              className="min-h-24 justify-start px-5 text-left"
              disabled={!masaProduct || masaKgPrice <= 0}
              onClick={() => openQuickSale(masaProduct, masaKgPrice)}
              variant="secondary"
            >
              <Scale className="h-5 w-5" aria-hidden="true" />
              <span>
                Masa
                <span className="block text-xs font-medium text-tp-muted">
                  F3 kg - F4 $ - {formatMoney(masaKgPrice)}/kg
                </span>
              </span>
            </Button>
            <PackageQuickButton
              buttonId="package-800-button"
              onAddItem={handleAddItem}
              product={package800gProduct}
              unitPrice={packagePrice}
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3">
          <Button className="min-h-14 justify-start px-5 text-left" disabled={Boolean(mercadoPagoDisabledReason)} variant="secondary">
            <CreditCard className="h-5 w-5" aria-hidden="true" />
            {mercadoPagoDisabledReason ? "Cobro Mercado Pago no listo" : "Terminal Mercado Pago lista"}
          </Button>
        </div>

        <ProductQuickGrid
          onAddItem={handleAddItem}
          onSearchChange={setSearchTerm}
          products={retailProducts}
          searchTerm={searchTerm}
        />
        <div className="mt-4">
          <PosErrorAlert error={quoteError ?? (cancelDraftMutation.isError ? "No se pudo cancelar la venta." : null)} />
        </div>
      </div>

      <CartPanel
        items={items}
        onCancelTicket={handleCancelTicket}
        onCheckout={() => void handleCheckout()}
        onClearCart={handleClearCart}
        onRemoveItem={handleRemoveItem}
        onUpdateQuantity={handleUpdateQuantity}
        subtotal={subtotal}
        total={total}
      />

      <PaymentModal
        error={paymentError}
        canUseManualCard={Boolean(user?.permissions.includes("payments.manual_card_reference"))}
        isSubmitting={checkoutMutation.isPending || isQuoting || createTerminalOrderMutation.isPending || confirmTerminalCheckoutMutation.isPending}
        onClose={() => {
          setCheckoutDraft(null);
          setIsPaymentOpen(false);
        }}
        onMercadoPagoSubmit={(payload) => createTerminalOrderMutation.mutate(payload)}
        onSubmit={(payload) => checkoutMutation.mutate(payload)}
        open={isPaymentOpen}
        selectedCustomer={selectedCustomer}
        mercadoPagoDisabledReason={mercadoPagoDisabledReason}
        terminalName={assignedTerminal?.terminalName ?? assignedTerminal?.terminalId ?? null}
        total={checkoutDraft?.total ?? total}
      />
      {terminalOrder ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <section className="w-full max-w-md rounded-md bg-white p-5 text-tp-text shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Mercado Pago</p>
            <h2 className="mt-2 text-xl font-semibold">
              {terminalOrder.status === "approved" ? "Pago aprobado" : "Esperando pago en terminal"}
            </h2>
            <p className="mt-2 text-sm text-tp-muted">
              {assignedTerminal?.terminalName ?? assignedTerminal?.terminalId ?? "Terminal asignada"} - {terminalOrder.amount} {terminalOrder.currency}
            </p>
            {!autoConfirmTerminalPayment && terminalOrder.status === "approved" ? (
              <p className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-700">Pago aprobado. Confirma la venta para cerrar el ticket.</p>
            ) : null}
            <p className="mt-3 rounded-md bg-tp-soft p-3 text-sm">Estado: {terminalOrder.status}</p>
            {terminalError ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-tp-danger">{terminalError}</p> : null}
            <div className="mt-4 flex gap-2">
              <Button
                disabled={cancelTerminalOrderMutation.isPending || confirmTerminalCheckoutMutation.isPending || terminalOrder.status === "approved"}
                onClick={() => cancelTerminalOrderMutation.mutate(terminalOrder.id)}
                variant="secondary"
              >
                Cancelar orden
              </Button>
              <Button
                disabled={confirmTerminalCheckoutMutation.isPending || terminalOrder.status !== "approved"}
                onClick={() => confirmTerminalCheckoutMutation.mutate(terminalOrder.id)}
              >
                Confirmar venta
              </Button>
            </div>
          </section>
        </div>
      ) : null}
      <ProductSaleModal
        initialMode={quickSaleProduct?.initialMode ?? "by_kg"}
        onAddItem={handleAddItem}
        onClose={() => setQuickSaleProduct(null)}
        open={Boolean(quickSaleProduct)}
        pricePerKg={quickSaleProduct?.pricePerKg ?? 0}
        product={quickSaleProduct?.product ?? null}
      />
      <SaleSuccessModal onNewSale={handleNewSale} sale={completedSale} />
    </section>
  );
}
