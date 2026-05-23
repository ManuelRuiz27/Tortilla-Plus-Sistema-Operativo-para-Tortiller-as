import { useMutation } from "@tanstack/react-query";
import { CreditCard, Scale } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiErrorException } from "../../../api/api-error";
import {
  addSaleItemRequest,
  cancelDraftSaleRequest,
  completeSaleRequest,
  createSaleRequest
} from "../../../api/sales.api";
import { Button } from "../../../shared/components/button";
import { LoadingState } from "../../../shared/components/loading-state";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { AmountSaleInput } from "../components/amount-sale-input";
import { CartPanel } from "../components/cart-panel";
import { PackageQuickButton } from "../components/package-quick-button";
import { PaymentModal } from "../components/payment-modal";
import { PosErrorAlert } from "../components/pos-error-alert";
import { ProductQuickGrid } from "../components/product-quick-grid";
import { SaleSuccessModal } from "../components/sale-success-modal";
import { WeightSaleInput } from "../components/weight-sale-input";
import { getProductPrice, usePosProducts } from "../hooks/use-pos-products";
import { usePosCartStore } from "../stores/pos-cart.store";
import type { CompletedSale, PosPayment } from "../types/payment.types";
import type { PosCartItem } from "../types/pos.types";

export function SalePage() {
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
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const items = usePosCartStore((state) => state.items);
  const subtotal = usePosCartStore((state) => state.subtotal);
  const total = usePosCartStore((state) => state.total);
  const addItem = usePosCartStore((state) => state.addItem);
  const removeItem = usePosCartStore((state) => state.removeItem);
  const clearCart = usePosCartStore((state) => state.clearCart);
  const setSaleDraftId = usePosCartStore((state) => state.setSaleDraftId);
  const saleDraftId = usePosCartStore((state) => state.saleDraftId);
  const clearSaleDraftId = usePosCartStore((state) => state.clearSaleDraftId);
  const checkoutMutation = useMutation({
    mutationFn: async (payload: { payments: PosPayment[]; changeAmount?: number }) => {
      if (!branchId) {
        throw new Error("Sucursal no seleccionada.");
      }

      const draft = await createSaleRequest({ branchId });
      setSaleDraftId(draft.id);
      await Promise.all(items.map((item) => addSaleItemRequest({ saleId: draft.id, item })));
      return completeSaleRequest({
        saleId: draft.id,
        total,
        payments: payload.payments,
        changeAmount: payload.changeAmount
      });
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
      setIsPaymentOpen(false);
      setPaymentError(null);
    }
  });

  function handleAddItem(item: PosCartItem) {
    addItem(item);
  }

  function handleCheckout() {
    if (items.length > 0 && total > 0 && !checkoutMutation.isPending) {
      setIsPaymentOpen(true);
    }
  }

  function handleNewSale() {
    setCompletedSale(null);
    document.getElementById("tortilla-kg-input")?.focus();
  }

  function handleCancelTicket() {
    if (items.length === 0 || !window.confirm("Cancelar ticket actual?")) {
      return;
    }

    cancelDraftMutation.mutate();
  }

  function focusInput(id: string) {
    document.getElementById(id)?.focus();
  }

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
        F1: () => focusInput("tortilla-kg-input"),
        F2: () => focusInput("tortilla-amount-input"),
        F3: () => focusInput("masa-kg-input"),
        F4: () => focusInput("masa-amount-input"),
        F5: () => document.getElementById("package-800-button")?.click(),
        F8: handleCheckout,
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
  }, [checkoutMutation.isPending, items.length, saleDraftId, total]);

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

  const tortillaKgPrice = tortillaProduct ? getProductPrice(tortillaProduct, "by_kg") : 0;
  const masaKgPrice = masaProduct ? getProductPrice(masaProduct, "by_kg") : 0;
  const packagePrice = package800gProduct ? getProductPrice(package800gProduct, "by_package") : 0;

  return (
    <section className="grid min-h-[calc(100vh-7rem)] gap-5 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0">
        <div className="rounded-md border border-tp-border bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">POS Cajero</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Venta rapida</h1>
              <p className="mt-1 text-sm text-tp-muted">Captura por kg, monto, paquete o retail.</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          <WeightSaleInput
            inputId="tortilla-kg-input"
            label="Tortilla kg"
            onAddItem={handleAddItem}
            pricePerKg={tortillaKgPrice}
            product={tortillaProduct}
            shortcut="F1"
          />
          <AmountSaleInput
            inputId="tortilla-amount-input"
            label="Tortilla $"
            onAddItem={handleAddItem}
            pricePerKg={tortillaKgPrice}
            product={tortillaProduct}
            shortcut="F2"
          />
          <WeightSaleInput
            inputId="masa-kg-input"
            label="Masa kg"
            onAddItem={handleAddItem}
            pricePerKg={masaKgPrice}
            product={masaProduct}
            shortcut="F3"
          />
          <AmountSaleInput
            inputId="masa-amount-input"
            label="Masa $"
            onAddItem={handleAddItem}
            pricePerKg={masaKgPrice}
            product={masaProduct}
            shortcut="F4"
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <PackageQuickButton
            buttonId="package-800-button"
            onAddItem={handleAddItem}
            product={package800gProduct}
            unitPrice={packagePrice}
          />
          <Button className="min-h-20 justify-start px-5 text-left" disabled variant="secondary">
            <Scale className="h-5 w-5" aria-hidden="true" />
            Bascula futura
          </Button>
          <Button className="min-h-20 justify-start px-5 text-left" disabled variant="secondary">
            <CreditCard className="h-5 w-5" aria-hidden="true" />
            Cobro FE-3
          </Button>
        </div>

        <ProductQuickGrid
          onAddItem={handleAddItem}
          onSearchChange={setSearchTerm}
          products={retailProducts}
          searchTerm={searchTerm}
        />
        <div className="mt-4">
          <PosErrorAlert error={cancelDraftMutation.isError ? "No se pudo cancelar el ticket." : null} />
        </div>
      </div>

      <CartPanel
        items={items}
        onCancelTicket={handleCancelTicket}
        onCheckout={handleCheckout}
        onClearCart={clearCart}
        onRemoveItem={removeItem}
        subtotal={subtotal}
        total={total}
      />

      <PaymentModal
        error={paymentError}
        isSubmitting={checkoutMutation.isPending}
        onClose={() => setIsPaymentOpen(false)}
        onSubmit={(payload) => checkoutMutation.mutate(payload)}
        open={isPaymentOpen}
        total={total}
      />
      <SaleSuccessModal onNewSale={handleNewSale} sale={completedSale} />
    </section>
  );
}
