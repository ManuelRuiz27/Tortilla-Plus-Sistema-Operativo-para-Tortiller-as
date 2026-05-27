import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, Scale, Wheat } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ApiErrorException } from "../../../api/api-error";
import { managerCustomersRequest } from "../../../api/manager.api";
import {
  cancelDraftSaleRequest,
  checkoutSaleRequest,
  quoteSaleRequest
} from "../../../api/sales.api";
import { Button } from "../../../shared/components/button";
import { LoadingState } from "../../../shared/components/loading-state";
import { useBranchStore } from "../../../shared/stores/branch.store";
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
import type { CompletedSale, PosPayment } from "../types/payment.types";
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
  const [quickSaleProduct, setQuickSaleProduct] = useState<QuickSaleProduct | null>(null);
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

      if (event.ctrlKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        focusInput("product-search");
        return;
      }

      if (isTyping) {
        return;
      }

      const shortcutMap: Record<string, () => void> = {
        F1: () => openQuickSale(tortillaProduct, tortillaKgPrice, "by_kg"),
        F2: () => openQuickSale(tortillaProduct, tortillaKgPrice, "by_amount"),
        F3: () => openQuickSale(masaProduct, masaKgPrice, "by_kg"),
        F4: () => openQuickSale(masaProduct, masaKgPrice, "by_amount"),
        F5: () => document.getElementById("package-800-button")?.click(),
        F8: () => void handleCheckout(),
        F9: handleCancelTicket
      };

      const action = shortcutMap[event.key];
      if (action) {
        event.preventDefault();
        action();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [checkoutMutation.isPending, items.length, masaKgPrice, masaProduct, saleDraftId, tortillaKgPrice, tortillaProduct, total]);

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

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Button className="min-h-14 justify-start px-5 text-left" disabled variant="secondary">
            <Scale className="h-5 w-5" aria-hidden="true" />
            Bascula futura
          </Button>
          <Button className="min-h-14 justify-start px-5 text-left" disabled variant="secondary">
            <CreditCard className="h-5 w-5" aria-hidden="true" />
            Cobro con terminal
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
        isSubmitting={checkoutMutation.isPending || isQuoting}
        onClose={() => {
          setCheckoutDraft(null);
          setIsPaymentOpen(false);
        }}
        onSubmit={(payload) => checkoutMutation.mutate(payload)}
        open={isPaymentOpen}
        selectedCustomer={selectedCustomer}
        total={checkoutDraft?.total ?? total}
      />
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
