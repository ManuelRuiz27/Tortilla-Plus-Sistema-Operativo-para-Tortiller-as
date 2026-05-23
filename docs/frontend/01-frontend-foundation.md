# Tortilla Plus — Frontend Foundation V0.1

## 1. Objetivo

Definir la base técnica del frontend para **Tortilla Plus — V1 Operativa Comercial** antes de construir pantallas de POS o gerente.

El frontend debe soportar:

```txt
POS PWA
PWA Gerente
Roles y permisos
Sucursal activa
Caja activa
Operación rápida con teclado
Consumo seguro del backend
Estados de error claros
Modo instalable PWA
```

---

## 2. Decisión base

### Tipo de frontend

Para V1, usar una sola aplicación PWA con módulos separados:

```txt
Tortilla Plus Frontend
├─ POS
└─ Gerente
```

No conviene separar en dos apps todavía. Separarlas ahora duplica autenticación, guards, API client, configuración PWA y manejo de sesión.

### Stack recomendado

```txt
React
Vite
TypeScript
React Router
TanStack Query
Zustand
Zod
Tailwind CSS
shadcn/ui
Lucide Icons
vite-plugin-pwa
```

### Justificación

| Herramienta | Uso |
|---|---|
| React | UI modular y rápida de construir. |
| Vite | Arranque simple y rápido. |
| TypeScript | Contratos fuertes contra backend. |
| React Router | Rutas POS/Gerente/Auth. |
| TanStack Query | Estado remoto, cache, loading/error. |
| Zustand | Estado local operativo: sucursal, caja, carrito. |
| Zod | Validación frontend de formularios y payloads. |
| Tailwind | Maquetación rápida y consistente. |
| shadcn/ui | Componentes base sin librería pesada. |
| Lucide Icons | Iconografía ligera. |
| vite-plugin-pwa | Instalación como PWA. |

---

## 3. Principios técnicos

### 3.1 Backend manda reglas

El frontend no decide reglas críticas. Solo refleja estados y valida para mejorar UX.

Ejemplos:

```txt
No vender sin caja abierta
No cerrar caja con retiros pendientes
No aceptar tarjeta sin referencia
No permitir crédito sin cliente
No permitir permisos fuera de rol
```

Todo eso debe venir validado por backend.

### 3.2 El frontend debe ser rápido para operación

El POS no es un dashboard. Es una herramienta de captura rápida.

Prioridades:

```txt
teclado primero
mínimos clics
botones grandes
flujo lineal
errores visibles
sin animaciones pesadas
sin pantallas decorativas
```

### 3.3 Separar POS de Gerente

Aunque sea una sola app, deben estar separados por módulos:

```txt
/src/modules/pos
/src/modules/manager
```

No mezclar componentes operativos del cajero con pantallas administrativas.

### 3.4 Mocks controlados

Frontend puede avanzar con mocks si backend no está listo, pero los mocks deben respetar el contrato backend.

No inventar respuestas arbitrarias.

---

## 4. Estructura recomendada

```txt
/src
├─ app/
│  ├─ router.tsx
│  ├─ providers.tsx
│  ├─ query-client.ts
│  └─ app-shell.tsx
│
├─ api/
│  ├─ http-client.ts
│  ├─ api-error.ts
│  ├─ auth.api.ts
│  ├─ subscriptions.api.ts
│  ├─ branches.api.ts
│  ├─ cash.api.ts
│  ├─ sales.api.ts
│  ├─ products.api.ts
│  ├─ inventory.api.ts
│  ├─ customers.api.ts
│  ├─ delivery.api.ts
│  ├─ billing.api.ts
│  └─ reports.api.ts
│
├─ modules/
│  ├─ auth/
│  ├─ branch/
│  ├─ pos/
│  └─ manager/
│
├─ shared/
│  ├─ components/
│  ├─ layouts/
│  ├─ hooks/
│  ├─ stores/
│  ├─ schemas/
│  ├─ types/
│  ├─ utils/
│  └─ constants/
│
├─ styles/
│  └─ globals.css
│
└─ main.tsx
```

---

## 5. Rutas base

### Rutas públicas

```txt
/login
/forgot-password        futuro
```

### Rutas protegidas

```txt
/app
/app/select-branch
/app/pos
/app/pos/cash/open
/app/pos/sale
/app/manager
/app/manager/dashboard
/app/manager/cash
/app/manager/inventory
/app/manager/production
/app/manager/products
/app/manager/customers
/app/manager/routes
/app/manager/billing
/app/manager/reports
/app/manager/settings
```

---

## 6. Redirección inicial

Después de login:

```txt
1. POST /auth/login
2. Guardar tokens.
3. GET /auth/me
4. Si usuario tiene una sucursal:
   guardar branch activa.
5. Si usuario tiene varias sucursales:
   enviar a /app/select-branch.
6. Si rol principal es cashier:
   enviar a /app/pos.
7. Si rol principal es manager/supervisor/owner:
   enviar a /app/manager.
```

---

## 7. Estados globales mínimos

### 7.1 Auth Store

```ts
type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: CurrentUser | null;
  isAuthenticated: boolean;
  login: (payload: LoginResponse) => void;
  logout: () => void;
};
```

Debe guardar:

```txt
accessToken
refreshToken
user
roles
permissions
organizationId
```

### 7.2 Branch Store

```ts
type BranchState = {
  activeBranchId: string | null;
  activeBranchName: string | null;
  branches: UserBranch[];
  setActiveBranch: (branch: UserBranch) => void;
  clearActiveBranch: () => void;
};
```

Regla:

```txt
No permitir POS ni Gerente sin branch activa.
```

### 7.3 Cash Store

```ts
type CashState = {
  activeCashSessionId: string | null;
  status: "unknown" | "not_open" | "open" | "closing" | "closed";
  setCashSession: (session: CashSession | null) => void;
  clearCashSession: () => void;
};
```

Regla:

```txt
Si no hay caja abierta, POS debe mandar a apertura de caja.
```

### 7.4 POS Cart Store

```ts
type PosCartState = {
  items: PosCartItem[];
  customerId: string | null;
  subtotal: number;
  total: number;
  saleDraftId: string | null;
  addItem: (item: PosCartItem) => void;
  updateItem: (itemId: string, patch: Partial<PosCartItem>) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  setSaleDraftId: (saleId: string) => void;
  clearSaleDraftId: () => void;
};
```

El carrito es estado local. La venta real se confirma en backend.

---

## 8. API Client

### 8.1 Archivo

```txt
/src/api/http-client.ts
```

### 8.2 Responsabilidades

```txt
baseURL
Authorization header
refresh token
timeout
parseo de errores
logout automático en 401 cuando refresh falla
```

### 8.3 Variable base

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

### 8.4 Error estándar backend

Backend responde:

```json
{
  "statusCode": 400,
  "error": "CARD_REFERENCE_REQUIRED",
  "message": "La referencia de tarjeta es obligatoria.",
  "details": {}
}
```

Frontend debe convertirlo a:

```ts
type ApiError = {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
};
```

---

## 9. Guards frontend

### 9.1 AuthGuard

Bloquea rutas privadas si no hay token.

```txt
Sin token → /login
Token expirado → refresh
Refresh inválido → logout
```

### 9.2 BranchGuard

Bloquea operación sin sucursal activa.

```txt
Sin branch activa → /app/select-branch
```

### 9.3 PermissionGuard

Oculta o bloquea acciones según permisos.

Ejemplos:

```txt
cash.withdraw.authorize
sales.cancel_after_payment
inventory.manage
billing.manage
routes.manage
```

No basta con ocultar botones. El backend también debe bloquear.

### 9.4 FeatureGuard

Bloquea módulos por plan.

Ejemplos:

```txt
billing_cfdi
multi_branch
delivery_routes
advanced_reports
```

En plan free:

```txt
mostrar mensaje de módulo no disponible
no mostrar error técnico
```

---

## 10. Layouts base

### 10.1 AuthLayout

Para:

```txt
/login
```

Contenido:

```txt
logo
formulario
estado de error
loading
```

### 10.2 POSLayout

Debe ser limpio, rápido y estable.

Estructura:

```txt
header compacto
zona principal de venta
carrito lateral
acciones inferiores
```

Header:

```txt
Sucursal
Caja activa
Usuario
Botón salir
```

### 10.3 ManagerLayout

Estructura:

```txt
sidebar
topbar
content area
```

Topbar:

```txt
Sucursal activa
Usuario
Estado de suscripción
Acciones rápidas
```

Sidebar:

```txt
Dashboard
Caja
Inventario
Producción
Productos
Clientes
Rutas
Facturación
Reportes
Configuración
```

---

## 11. Módulos iniciales

### 11.1 Auth Module

```txt
/modules/auth
├─ pages/login-page.tsx
├─ components/login-form.tsx
├─ hooks/use-login.ts
└─ schemas/login.schema.ts
```

Endpoints:

```txt
POST /auth/login
POST /auth/refresh
POST /auth/logout
POST /auth/validate-pin
GET /auth/me
```

### 11.2 Branch Module

```txt
/modules/branch
├─ pages/select-branch-page.tsx
├─ components/branch-card.tsx
└─ hooks/use-branches.ts
```

Fuente:

```txt
GET /auth/me
```

### 11.3 POS Module

```txt
/modules/pos
├─ pages/pos-router-page.tsx
├─ pages/open-cash-page.tsx
├─ pages/sale-page.tsx
├─ pages/payment-page.tsx
├─ components/product-quick-grid.tsx
├─ components/weight-sale-input.tsx
├─ components/amount-sale-input.tsx
├─ components/cart-panel.tsx
├─ components/payment-modal.tsx
├─ components/sale-success-modal.tsx
├─ hooks/use-open-cash-session.ts
├─ hooks/use-current-cash-session.ts
├─ hooks/use-create-sale.ts
├─ hooks/use-complete-sale.ts
└─ stores/pos-cart.store.ts
```

### 11.4 Manager Module

```txt
/modules/manager
├─ pages/dashboard-page.tsx
├─ pages/cash-page.tsx
├─ pages/inventory-page.tsx
├─ pages/production-page.tsx
├─ pages/products-page.tsx
├─ pages/customers-page.tsx
├─ pages/routes-page.tsx
├─ pages/billing-page.tsx
├─ pages/reports-page.tsx
└─ components/
```

---

## 12. Frontend Sprint 0 — Foundation

### Objetivo

Crear una app PWA lista para consumir backend y montar módulos POS/Gerente.

### Entregables

```txt
React + Vite + TypeScript
Router
Layouts base
Auth store
Branch store
Cash store
API client
Error handler
PWA config
Mock API temporal
shadcn/ui base
Tailwind config
```

### Checklist FE-0

```txt
[ ] Crear proyecto Vite React TS
[ ] Instalar React Router
[ ] Instalar TanStack Query
[ ] Instalar Zustand
[ ] Instalar Zod
[ ] Instalar Tailwind
[ ] Instalar shadcn/ui
[ ] Instalar vite-plugin-pwa
[ ] Crear estructura /src
[ ] Crear http-client
[ ] Crear ApiError parser
[ ] Crear AuthStore
[ ] Crear BranchStore
[ ] Crear CashStore
[ ] Crear router
[ ] Crear AuthGuard
[ ] Crear BranchGuard
[ ] Crear PermissionGuard
[ ] Crear FeatureGuard
[ ] Crear AuthLayout
[ ] Crear POSLayout
[ ] Crear ManagerLayout
[ ] Crear /login
[ ] Crear /app/select-branch
[ ] Crear /app/pos placeholder
[ ] Crear /app/manager placeholder
[ ] Crear página 404
[ ] Crear estados loading/error
[ ] Crear .env.example
```

---

## 13. Comandos base esperados

```bash
npm create vite@latest tortilla-plus-pwa -- --template react-ts
cd tortilla-plus-pwa
npm install
npm install react-router-dom @tanstack/react-query zustand zod
npm install lucide-react
npm install -D tailwindcss postcss autoprefixer
npm install -D vite-plugin-pwa
```

Si usan shadcn:

```bash
npx shadcn@latest init
```

---

## 14. Variables de entorno

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_NAME=Tortilla Plus
VITE_APP_ENV=local
```

---

## 15. Convenciones frontend

### Naming

```txt
pages/*.tsx
components/*.tsx
hooks/use-*.ts
stores/*.store.ts
schemas/*.schema.ts
types/*.types.ts
```

### Componentes

Un componente debe tener una responsabilidad clara.

Mala práctica:

```txt
sale-page.tsx con 800 líneas
```

Correcto:

```txt
sale-page.tsx
cart-panel.tsx
product-quick-grid.tsx
payment-modal.tsx
```

---

## 16. Manejo de errores UX

Errores operativos deben mostrarse en español claro.

| Error backend | Mensaje UI |
|---|---|
| `NO_OPEN_CASH_SESSION` | No hay caja abierta para vender. |
| `CARD_REFERENCE_REQUIRED` | Captura la referencia de la terminal. |
| `PAYMENT_TOTAL_MISMATCH` | El pago no coincide con el total. |
| `PENDING_CASH_MOVEMENTS` | Hay retiros pendientes antes de cerrar caja. |
| `CUSTOMER_CREDIT_DISABLED` | Este cliente no tiene crédito habilitado. |
| `FEATURE_NOT_AVAILABLE` | Este módulo no está disponible en tu plan. |
| `BRANCH_ACCESS_DENIED` | No tienes acceso a esta sucursal. |

---

## 17. QA Frontend Foundation

### FE-QA-0001

Login correcto redirige según rol y sucursal.

### FE-QA-0002

Login incorrecto muestra error legible.

### FE-QA-0003

Usuario sin branch activa entra a selección de sucursal.

### FE-QA-0004

Ruta protegida sin token redirige a login.

### FE-QA-0005

Feature no disponible no rompe pantalla; muestra bloqueo.

### FE-QA-0006

Error estándar backend se muestra correctamente.

### FE-QA-0007

Al recargar página, sesión y sucursal activa se restauran.

### FE-QA-0008

PWA instala correctamente en navegador compatible.

---

## 18. Definition of Done FE-0

```txt
[ ] App corre con npm run dev
[ ] Router funciona
[ ] Login page existe
[ ] Select branch page existe
[ ] POS placeholder existe
[ ] Manager placeholder existe
[ ] AuthGuard funciona
[ ] BranchGuard funciona
[ ] API client agrega token
[ ] Errores API se parsean correctamente
[ ] Stores básicos funcionan
[ ] PWA manifest configurado
[ ] .env.example existe
[ ] Build corre sin errores
```

---

## 19. Siguiente documento

Después de este Foundation, sigue:

```txt
Frontend POS Flow V0.1
```

Ese documento define:

```txt
pantalla apertura de caja
pantalla venta
carrito
captura por kilo
captura por monto
paquete 800g
cobro efectivo
cobro tarjeta
resultado venta
atajos de teclado
QA funcional POS
```
