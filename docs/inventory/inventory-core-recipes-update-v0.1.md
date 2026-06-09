# Tortilla Plus — Actualización del Núcleo de Inventario con Recetas V0.1

**Producto:** Tortilla Plus — V1 Operativa Comercial  
**Área:** Inventario, producción, insumos, recetas, POS, reparto  
**Tipo:** Actualización funcional del núcleo operativo  
**Estado:** Propuesta técnica para revisión antes de desarrollo  
**Prioridad:** Alta  

---

## 1. Contexto

Durante el análisis de prospectos de cliente se detectó que varias tortillerías no compran masa terminada, sino que producen su propia materia prima a partir de ingredientes como maíz, cal, harina de maíz, harina de trigo, agua y otros complementos.

La receta promedio recabada fue:

```txt
Maíz:             25.000 kg
Harina de maíz:    8.000 kg
Cal:               0.100 kg
Harina de trigo:   0.500 kg
Resultado:        33.000 kg de tortilla / masa base reportada
```

Este hallazgo cambia el modelo operativo. El sistema ya no debe tratar la producción únicamente como una captura manual de kilos producidos. Debe permitir controlar insumos, recetas, lotes de producción, consumo de materia prima y rendimiento.

El flujo conceptual pasa de:

```txt
Producto terminado → stock → venta
```

a:

```txt
Insumos → receta → lote de producción → masa/tortilla → venta
```

---

## 2. Objetivo de la actualización

Actualizar el núcleo de inventario para soportar producción basada en recetas, sin romper los flujos actuales de POS, caja, reparto, clientes, precios especiales, crédito/fiado y facturación.

La actualización debe permitir:

```txt
1. Registrar insumos como maíz, cal, harinas y empaques.
2. Configurar recetas por organización y opcionalmente por sucursal.
3. Versionar recetas para conservar histórico.
4. Crear lotes de producción desde receta.
5. Calcular insumos esperados.
6. Capturar insumos reales.
7. Capturar salida real de masa o tortilla.
8. Calcular rendimiento esperado vs real.
9. Descontar insumos del inventario.
10. Aumentar inventario de masa/tortilla producida.
11. Auditar movimientos de inventario.
```

---

## 3. Principios técnicos

### 3.1 No reescribir el sistema

La actualización debe ser incremental. No debe romper:

```txt
- POS actual.
- Caja operativa.
- Venta por kilo.
- Venta por monto.
- Venta por paquete.
- Venta de retail.
- Clientes y precios especiales.
- Crédito/fiado.
- Rutas de reparto.
- Liquidación de rutas.
- Facturación actual.
```

### 3.2 No crear recetas como JSON aislado

No se debe resolver con un campo tipo `recipeJson` en `Product`.

Eso impediría:

```txt
- Auditar consumo de insumos.
- Calcular rendimiento.
- Versionar recetas.
- Generar reportes de producción.
- Comparar lotes.
- Controlar stock real.
- Mantener histórico confiable.
```

### 3.3 El inventario debe moverse desde un solo punto

La actualización debe introducir un `InventoryLedgerService` como fuente única para modificar stock.

Actualmente existen movimientos de inventario en diferentes servicios. La meta es que POS, reparto, producción, ajustes y devoluciones deleguen a un servicio centralizado.

---

## 4. Cambio conceptual en inventario

### 4.1 Tipos de producto actuales

El sistema contempla productos como:

```txt
tortilla
masa
package
retail
service
```

### 4.2 Tipos de producto requeridos

Se deben agregar tipos para producción:

```txt
raw_material    // maíz, cal, harina de maíz, harina de trigo
packaging       // bolsas, papel, empaques
```

Clasificación sugerida:

```txt
raw_material:
  - Maíz
  - Cal
  - Harina de maíz
  - Harina de trigo
  - Conservadores
  - Complementos

packaging:
  - Bolsa
  - Papel
  - Empaque

masa:
  - Producto intermedio
  - Producto vendible por kg o por monto

 tortilla:
  - Producto terminado
  - Producto vendible por kg, monto o paquete indirecto

package:
  - Producto comercial que descuenta producto base
  - Ejemplo: paquete 800 g

retail:
  - Salsa
  - Guisos
  - Bebidas
  - Productos externos

service:
  - Servicios sin inventario
```

---

## 5. Cambios al modelo de datos

## 5.1 Modificar enum `ProductType`

Agregar:

```prisma
enum ProductType {
  tortilla
  masa
  package
  retail
  service
  raw_material
  packaging

  @@map("product_type")
}
```

---

## 5.2 Modificar modelo `Product`

Agregar campos:

```prisma
isRecipeIngredient Boolean @default(false) @map("is_recipe_ingredient")
allowNegativeStock Boolean @default(false) @map("allow_negative_stock")
```

Reglas sugeridas:

```txt
raw_material:
  isSellable = false
  requiresProduction = false
  isStockTracked = true
  isRecipeIngredient = true
  allowNegativeStock = false

packaging:
  isSellable = false
  requiresProduction = false
  isStockTracked = true
  isRecipeIngredient = true/false según uso
  allowNegativeStock = false

masa:
  isSellable = true
  requiresProduction = true
  isStockTracked = true
  isRecipeIngredient = true si se usa para producir tortilla

 tortilla:
  isSellable = true
  requiresProduction = true
  isStockTracked = true

package:
  isSellable = true
  requiresProduction = false
  isStockTracked = false si descuenta producto base

retail:
  isSellable = true
  requiresProduction = false
  isStockTracked = true
```

---

## 5.3 Nueva tabla `UnitConversion`

Necesaria para unidades operativas no estándar como cubetas o costales.

```prisma
model UnitConversion {
  id             String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String        @map("organization_id") @db.Uuid
  productId      String        @map("product_id") @db.Uuid

  fromUnit        String        @map("from_unit") @db.VarChar(40)
  toUnit          ProductUnit   @map("to_unit")
  factor          Decimal       @db.Decimal(12, 6)
  name            String?       @db.VarChar(120)
  status          GenericStatus @default(active)

  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime      @default(now()) @map("updated_at") @db.Timestamptz(6)

  product         Product       @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([organizationId, productId, fromUnit, name])
  @@index([organizationId])
  @@map("unit_conversions")
}
```

Ejemplo operativo:

```txt
Producto: Maíz
1 cubeta estándar = 25 kg
1 costal = 50 kg
```

---

## 5.4 Nueva tabla `Recipe`

Representa la receta lógica principal.

```prisma
model Recipe {
  id              String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId  String        @map("organization_id") @db.Uuid
  branchId        String?       @map("branch_id") @db.Uuid

  name            String        @db.VarChar(160)
  outputProductId String        @map("output_product_id") @db.Uuid

  status          GenericStatus @default(active)
  currentVersion  Int           @default(1) @map("current_version")

  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime      @default(now()) @map("updated_at") @db.Timestamptz(6)

  outputProduct   Product       @relation(fields: [outputProductId], references: [id])
  versions        RecipeVersion[]

  @@index([organizationId])
  @@map("recipes")
}
```

Regla:

```txt
Una receta pertenece a una organización.
Puede aplicar globalmente a todas las sucursales o a una sucursal específica.
```

---

## 5.5 Nueva tabla `RecipeVersion`

No se deben editar recetas usadas históricamente. Cada cambio relevante crea una nueva versión.

```prisma
model RecipeVersion {
  id                     String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  recipeId               String        @map("recipe_id") @db.Uuid
  version                Int

  expectedOutputQuantity Decimal       @map("expected_output_quantity") @db.Decimal(12, 3)
  outputUnit             ProductUnit   @map("output_unit")

  notes                  String?
  status                 GenericStatus @default(active)

  createdAt              DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt              DateTime      @default(now()) @map("updated_at") @db.Timestamptz(6)

  recipe                 Recipe        @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  ingredients            RecipeIngredient[]

  @@unique([recipeId, version])
  @@map("recipe_versions")
}
```

---

## 5.6 Nueva tabla `RecipeIngredient`

Define los insumos esperados por versión de receta.

```prisma
model RecipeIngredient {
  id              String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  recipeVersionId String        @map("recipe_version_id") @db.Uuid
  productId       String        @map("product_id") @db.Uuid

  quantity        Decimal       @db.Decimal(12, 3)
  unit            ProductUnit

  isOptional      Boolean       @default(false) @map("is_optional")
  wasteFactor     Decimal?      @map("waste_factor") @db.Decimal(5, 2)

  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime      @default(now()) @map("updated_at") @db.Timestamptz(6)

  recipeVersion   RecipeVersion @relation(fields: [recipeVersionId], references: [id], onDelete: Cascade)
  product         Product       @relation(fields: [productId], references: [id])

  @@unique([recipeVersionId, productId])
  @@map("recipe_ingredients")
}
```

---

## 5.7 Nuevo enum `ProductionMode`

```prisma
enum ProductionMode {
  manual
  recipe_based

  @@map("production_mode")
}
```

---

## 5.8 Modificar `ProductionBatch`

Agregar campos:

```prisma
recipeVersionId          String?        @map("recipe_version_id") @db.Uuid
productionMode           ProductionMode @default(manual) @map("production_mode")

outputProductId          String?        @map("output_product_id") @db.Uuid
expectedOutputQuantity   Decimal?       @map("expected_output_quantity") @db.Decimal(12, 3)
actualOutputQuantity     Decimal?       @map("actual_output_quantity") @db.Decimal(12, 3)
outputUnit               ProductUnit?   @map("output_unit")

yieldPercentage          Decimal?       @map("yield_percentage") @db.Decimal(6, 2)
varianceReason           String?        @map("variance_reason")
```

Regla:

```txt
productionMode = manual:
  permite el flujo actual de producción simple.

productionMode = recipe_based:
  requiere receta, ingredientes esperados, salida real y cierre con movimientos de inventario.
```

---

## 5.9 Nueva tabla `ProductionBatchIngredient`

Snapshot de los insumos consumidos en un lote.

```prisma
model ProductionBatchIngredient {
  id                    String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  productionBatchId     String             @map("production_batch_id") @db.Uuid
  productId             String             @map("product_id") @db.Uuid

  expectedQuantity      Decimal            @map("expected_quantity") @db.Decimal(12, 3)
  actualQuantity        Decimal            @map("actual_quantity") @db.Decimal(12, 3)
  unit                  ProductUnit

  inventoryMovementId   String?            @map("inventory_movement_id") @db.Uuid

  createdAt             DateTime           @default(now()) @map("created_at") @db.Timestamptz(6)

  productionBatch       ProductionBatch    @relation(fields: [productionBatchId], references: [id], onDelete: Cascade)
  product               Product            @relation(fields: [productId], references: [id])
  inventoryMovement     InventoryMovement? @relation(fields: [inventoryMovementId], references: [id])

  @@map("production_batch_ingredients")
}
```

---

## 6. Backend requerido

## 6.1 Nuevo `InventoryLedgerService`

Responsabilidad:

```txt
Centralizar todo movimiento de inventario.
```

Debe ser usado por:

```txt
- Producción.
- POS.
- Reparto.
- Devoluciones.
- Mermas.
- Ajustes manuales.
```

Interfaz sugerida:

```ts
applyMovement({
  organizationId,
  branchId,
  productId,
  movementType,
  quantity,
  unit,
  referenceType,
  referenceId,
  createdByUserId,
  authorizedByUserId,
  allowNegative,
  reason,
  idempotencyKey,
});
```

Reglas:

```txt
- Crear InventoryMovement.
- Actualizar InventoryStock.
- Bloquear duplicados por referencia cuando aplique.
- Validar stock negativo según política.
- Auditar movimientos críticos.
```

---

## 6.2 Nuevo `RecipeService`

Responsabilidades:

```txt
- Crear receta.
- Crear nueva versión.
- Listar recetas.
- Obtener detalle.
- Activar versión.
- Archivar receta.
- Validar ingredientes.
```

No debe modificar stock.

---

## 6.3 Nuevo `ProductionRecipeService`

Responsabilidades:

```txt
- Crear lote desde receta.
- Calcular insumos esperados.
- Permitir captura de insumos reales.
- Permitir captura de salida real.
- Calcular rendimiento.
- Cerrar lote.
- Delegar movimientos a InventoryLedgerService.
```

---

## 6.4 Cambios en `inventory-service.ts`

Cambios:

```txt
- Permitir productos raw_material y packaging.
- Agregar filtros por productType e isRecipeIngredient.
- Delegar movimientos a InventoryLedgerService.
- No duplicar reglas de stock.
```

---

## 6.5 Cambios en `sale-service.ts`

Cambios:

```txt
- Bloquear venta de raw_material y packaging.
- Mantener venta de tortilla, masa, package y retail.
- Mantener descuento de package contra producto base.
- Delegar descuento de inventario a InventoryLedgerService.
```

El POS no debe conocer recetas.

---

## 6.6 Cambios en `delivery-service.ts`

Cambios:

```txt
- Bloquear carga de raw_material y packaging.
- Mantener carga de productos vendibles.
- Delegar descuento de inventario a InventoryLedgerService.
- Resolver paquete contra producto base desde lógica compartida.
```

Decisión pendiente:

```txt
¿Ruta permite stock negativo de tortilla/masa igual que POS?
```

---

## 7. API y endpoints

## 7.1 Cambios en productos

### Endpoint existente

```http
POST /api/v1/products
```

Debe aceptar `raw_material` y `packaging`.

Payload ejemplo:

```json
{
  "name": "Maíz",
  "sku": "MAIZ-KG",
  "productType": "raw_material",
  "unit": "kg",
  "isSellable": false,
  "requiresProduction": false,
  "isStockTracked": true,
  "isRecipeIngredient": true,
  "categoryName": "Insumos"
}
```

### Endpoint existente con filtros nuevos

```http
GET /api/v1/products?productType=raw_material
GET /api/v1/products?isRecipeIngredient=true
GET /api/v1/products?isSellable=true
```

---

## 7.2 Endpoints de conversiones

```http
GET    /api/v1/products/{productId}/unit-conversions
POST   /api/v1/products/{productId}/unit-conversions
PATCH  /api/v1/unit-conversions/{id}
DELETE /api/v1/unit-conversions/{id}
```

Payload:

```json
{
  "fromUnit": "cubeta",
  "toUnit": "kg",
  "factor": "25.000",
  "name": "Cubeta estándar"
}
```

---

## 7.3 Endpoints de recetas

```http
GET    /api/v1/recipes
POST   /api/v1/recipes
GET    /api/v1/recipes/{id}
PATCH  /api/v1/recipes/{id}
POST   /api/v1/recipes/{id}/versions
PATCH  /api/v1/recipe-versions/{id}/activate
PATCH  /api/v1/recipe-versions/{id}/archive
```

Crear receta:

```json
{
  "name": "Masa estándar",
  "branchId": null,
  "outputProductId": "masa-product-id",
  "expectedOutputQuantity": "33.000",
  "outputUnit": "kg",
  "ingredients": [
    {
      "productId": "maiz-id",
      "quantity": "25.000",
      "unit": "kg"
    },
    {
      "productId": "harina-maiz-id",
      "quantity": "8.000",
      "unit": "kg"
    },
    {
      "productId": "cal-id",
      "quantity": "0.100",
      "unit": "kg"
    },
    {
      "productId": "harina-trigo-id",
      "quantity": "0.500",
      "unit": "kg"
    }
  ]
}
```

---

## 7.4 Endpoints de producción por receta

Se conservan endpoints existentes y se amplía su payload.

### Crear lote

```http
POST /api/v1/production/batches
```

Payload:

```json
{
  "branchId": "branch-id",
  "productionDate": "2026-06-09",
  "productionMode": "recipe_based",
  "recipeVersionId": "recipe-version-id",
  "plannedOutputQuantity": "33.000"
}
```

Respuesta esperada:

```json
{
  "data": {
    "id": "batch-id",
    "status": "open",
    "productionMode": "recipe_based",
    "expectedOutputQuantity": "33.000",
    "ingredients": [
      {
        "productId": "maiz-id",
        "expectedQuantity": "25.000",
        "actualQuantity": "25.000",
        "unit": "kg"
      }
    ]
  }
}
```

### Actualizar insumos reales

```http
PATCH /api/v1/production/batches/{id}/ingredients
```

Payload:

```json
{
  "ingredients": [
    {
      "productId": "maiz-id",
      "actualQuantity": "24.500",
      "unit": "kg"
    },
    {
      "productId": "cal-id",
      "actualQuantity": "0.090",
      "unit": "kg"
    }
  ]
}
```

### Capturar salida real

```http
PATCH /api/v1/production/batches/{id}/output
```

Payload:

```json
{
  "actualOutputQuantity": "32.500",
  "varianceReason": "Maíz con menor humedad"
}
```

### Cerrar lote

```http
PATCH /api/v1/production/batches/{id}/close
```

Debe:

```txt
1. Validar lote abierto.
2. Validar receta/version.
3. Validar insumos reales.
4. Validar salida real.
5. Descontar insumos.
6. Aumentar masa/tortilla.
7. Calcular rendimiento.
8. Crear movimientos.
9. Auditar.
10. Bloquear doble cierre.
```

---

## 7.5 Endpoint de movimientos de inventario

Nuevo endpoint:

```http
GET /api/v1/inventory/movements?branchId=&productId=&from=&to=&movementType=
```

Uso:

```txt
Auditar qué movimientos afectaron el stock.
```

---

## 8. Validaciones requeridas

## 8.1 Validaciones de producto

```txt
raw_material:
  - No puede venderse en POS.
  - Debe ser stockeable.
  - Puede ser ingrediente de receta.
  - No debe requerir producción.

packaging:
  - No puede venderse en POS.
  - Puede ser stockeable.
  - Puede ser ingrediente si se descuenta por producción/empaque.

masa:
  - Puede venderse.
  - Puede ser salida de receta.
  - Puede ser ingrediente si después se modela masa → tortilla.

tortilla:
  - Puede venderse.
  - Puede ser salida de producción.
  - Puede ser producto base de paquete.

package:
  - Debe tener ProductPackageConfig.
  - Debe apuntar a tortilla o masa.
  - No debe descontar stock propio si descuenta producto base.
```

---

## 8.2 Validaciones de receta

```txt
- La receta debe pertenecer a la organización del usuario.
- branchId, si existe, debe pertenecer a la organización.
- outputProductId debe ser masa o tortilla.
- outputProductId debe tener isStockTracked=true.
- outputProductId no puede repetirse como ingrediente en la misma receta.
- Debe existir al menos un ingrediente.
- Cada ingrediente debe ser stockeable.
- Cada cantidad debe ser mayor a cero.
- No debe haber ingredientes duplicados.
- Las unidades deben ser compatibles.
- Si se usa una unidad operativa como cubeta, debe existir conversión.
```

---

## 8.3 Validaciones de versión

```txt
- Una versión usada en producción no se edita.
- Si cambia la receta, se crea versión nueva.
- Solo una versión activa por receta.
- No se puede activar una versión sin ingredientes.
```

---

## 8.4 Validaciones de producción

```txt
- No se puede cerrar lote cerrado.
- No se puede cerrar lote cancelado.
- No se puede cerrar lote sin salida real.
- No se puede cerrar lote con salida real <= 0.
- No se puede cerrar lote sin insumos reales.
- No se puede cerrar lote si falta stock de insumos, salvo autorización.
- Si hay diferencia fuerte entre esperado y real, pedir motivo.
- Si la diferencia excede tolerancia, pedir autorización.
```

Tolerancia sugerida:

```txt
Diferencia menor a 3%:
  permite cerrar.

Diferencia entre 3% y 10%:
  pide motivo.

Diferencia mayor a 10%:
  pide autorización de gerente/supervisor.
```

---

## 8.5 Validaciones de inventario

```txt
- Todo movimiento automático debe tener referenceType y referenceId.
- Ajuste manual siempre requiere motivo.
- Movimiento duplicado por la misma referencia debe bloquearse.
- Raw materials no permiten negativo sin autorización.
- Retail no permite negativo.
- Tortilla/masa pueden permitir negativo solo según política configurada.
```

---

## 9. Frontend requerido

## 9.1 Nuevas pantallas

Se requieren 4 pantallas nuevas.

### 9.1.1 Pantalla: Insumos

Ruta sugerida:

```txt
/inventory/inputs
```

Objetivo:

```txt
Administrar maíz, cal, harinas, empaques y otros insumos.
```

Funciones:

```txt
- Listar insumos.
- Crear insumo.
- Editar insumo.
- Ver stock actual.
- Configurar unidad base.
- Configurar conversiones como cubeta, costal o gramo.
```

---

### 9.1.2 Pantalla: Recetas

Ruta sugerida:

```txt
/production/recipes
```

Funciones:

```txt
- Crear receta.
- Elegir producto de salida: masa o tortilla.
- Capturar ingredientes.
- Capturar rendimiento esperado.
- Ver versiones.
- Activar versión.
- Archivar receta.
```

---

### 9.1.3 Pantalla: Nuevo lote de producción

Ruta sugerida:

```txt
/production/new
```

Funciones:

```txt
- Elegir sucursal.
- Elegir receta.
- Ver ingredientes esperados.
- Ajustar cantidad planeada.
- Crear lote abierto.
```

---

### 9.1.4 Pantalla: Detalle / cierre de lote

Ruta sugerida:

```txt
/production/batches/:id
```

Funciones:

```txt
- Ver receta usada.
- Ver insumos esperados.
- Capturar insumos reales.
- Capturar salida real.
- Ver rendimiento.
- Cerrar lote.
- Ver movimientos generados.
```

Esta es la pantalla operativa crítica.

---

## 9.2 Pantallas existentes que cambian

### 9.2.1 Productos

Cambios:

```txt
- Separar productos vendibles de insumos.
- Evitar mezclar maíz/cal/harina con salsa/tortilla/masa.
- Agregar productType raw_material y packaging.
- Ocultar campos de venta cuando el producto no sea vendible.
```

---

### 9.2.2 Inventario

Cambios:

```txt
- Agregar filtros por tipo de producto.
- Mostrar insumos.
- Mostrar stock bajo.
- Mostrar stock negativo.
- Mostrar último movimiento.
- Mostrar unidad base.
```

Filtros mínimos:

```txt
- Vendibles
- Insumos
- Masa / tortilla
- Bajo mínimo
- Negativos
```

---

### 9.2.3 Producción

Cambios:

```txt
- Separar producción manual de producción por receta.
- Mostrar historial de lotes.
- Mostrar estado open/closed/cancelled.
- Agregar acceso a detalle de lote.
```

---

### 9.2.4 POS

Cambios mínimos:

```txt
- No mostrar raw_material.
- No mostrar packaging.
- Mantener tortilla, masa, package y retail.
- No mostrar recetas.
```

El POS debe seguir rápido.

---

### 9.2.5 Rutas

Cambios mínimos:

```txt
- No permitir cargar raw_material ni packaging.
- Mantener productos vendibles.
- Si carga paquete, backend descuenta producto base.
```

---

### 9.2.6 Reportes / Dashboard

No deben entrar en el primer corte, pero quedan preparados para fase posterior:

```txt
- Rendimiento por lote.
- Consumo de maíz por día.
- Consumo de harina por día.
- Producción esperada vs real.
- Merma por receta.
- Stock bajo de insumos.
```

---

## 10. División frontend/backend

## 10.1 Backend

Debe encargarse de:

```txt
- Modelo de datos.
- Reglas de negocio.
- Validaciones duras.
- Conversiones de unidad.
- Cálculo de consumo.
- Cálculo de rendimiento.
- Movimientos de inventario.
- Auditoría.
- Permisos.
- Bloqueo de doble cierre.
- Idempotencia.
```

## 10.2 Frontend

Debe encargarse de:

```txt
- Capturar recetas.
- Mostrar ingredientes esperados.
- Permitir capturar cantidades reales.
- Mostrar alertas visuales.
- Mostrar rendimiento.
- Separar insumos de productos vendibles.
- Evitar que el usuario se pierda.
```

Regla:

```txt
El frontend puede mostrar cálculos estimados, pero el backend decide y valida el resultado final.
```

---

## 11. Permisos nuevos

Agregar permisos:

```txt
recipes.view
recipes.manage
production.create
production.close
production.authorize_variance
inventory.inputs.manage
inventory.movements.view
```

Asignación sugerida:

```txt
Owner / Gerente:
  - todos

Supervisor:
  - production.create
  - production.close
  - production.authorize_variance
  - inventory.movements.view

Cajero:
  - sin acceso a recetas
  - sin acceso a insumos
  - sin acceso a ajustes
  - solo POS
```

---

## 12. Flujo operativo esperado

```txt
1. Gerente crea insumos:
   Maíz, cal, harina de maíz, harina de trigo.

2. Gerente configura conversiones:
   1 cubeta de maíz = 25 kg.

3. Gerente crea receta:
   Masa estándar → salida esperada 33 kg.

4. Encargado inicia lote:
   Receta Masa estándar.

5. Sistema calcula insumos esperados.

6. Encargado confirma o ajusta insumos reales.

7. Encargado captura salida real:
   Ejemplo: 32.500 kg.

8. Sistema calcula rendimiento.

9. Encargado cierra lote.

10. Backend descuenta insumos.

11. Backend aumenta stock de masa o tortilla.

12. POS vende masa, tortilla, paquete o retail.
```

---

## 13. Orden recomendado de desarrollo

## 13.1 Fase 1 — Base de datos

```txt
- Agregar ProductType raw_material.
- Agregar ProductType packaging.
- Agregar campos isRecipeIngredient y allowNegativeStock en Product.
- Agregar UnitConversion.
- Agregar Recipe.
- Agregar RecipeVersion.
- Agregar RecipeIngredient.
- Agregar ProductionMode.
- Extender ProductionBatch.
- Agregar ProductionBatchIngredient.
```

## 13.2 Fase 2 — Backend núcleo

```txt
- Crear InventoryLedgerService.
- Crear RecipeService.
- Crear ProductionRecipeService.
- Refactorizar producción para cierre con receta.
- Refactorizar POS para usar InventoryLedgerService.
- Refactorizar reparto para usar InventoryLedgerService.
- Bloquear venta/carga de raw_material y packaging.
```

## 13.3 Fase 3 — API

```txt
- Endpoints de recetas.
- Endpoints de conversiones.
- Endpoints de producción por receta.
- Endpoint de movimientos de inventario.
- Filtros nuevos en productos.
```

## 13.4 Fase 4 — Frontend mínimo

```txt
- Pantalla Insumos.
- Pantalla Recetas.
- Pantalla Nuevo lote.
- Pantalla Cierre de lote.
- Ajustes a Productos.
- Ajustes a Inventario.
- Ajustes a Producción.
- Filtro en POS para no mostrar insumos.
```

## 13.5 Fase 5 — QA

Pruebas mínimas obligatorias:

```txt
QA-INV-REC-001 crear insumos.
QA-INV-REC-002 crear receta con ingredientes válidos.
QA-INV-REC-003 bloquear receta sin ingredientes.
QA-INV-REC-004 bloquear receta con output como ingrediente.
QA-INV-REC-005 crear lote desde receta.
QA-INV-REC-006 calcular insumos esperados.
QA-INV-REC-007 actualizar insumos reales.
QA-INV-REC-008 capturar salida real.
QA-INV-REC-009 cerrar lote descuenta insumos.
QA-INV-REC-010 cerrar lote aumenta masa/tortilla.
QA-INV-REC-011 bloquear doble cierre.
QA-INV-REC-012 bloquear insumo sin stock.
QA-INV-REC-013 permitir cierre con autorización.
QA-INV-REC-014 receta versionada no altera lotes históricos.
QA-INV-REC-015 POS no muestra insumos.
QA-INV-REC-016 ruta no carga insumos.
QA-INV-REC-017 paquete sigue descontando producto base.
QA-INV-REC-018 devolución no vendible registra movimiento y merma si aplica.
QA-INV-REC-019 movimiento duplicado por referencia no duplica stock.
QA-INV-REC-020 producción usa fecha local de sucursal.
```

---

## 14. Decisiones pendientes antes de desarrollo

Estas decisiones deben cerrarse antes de codificar:

```txt
1. ¿La receta produce masa o tortilla directamente en V1?
2. ¿Se modelará masa → tortilla como segundo paso desde el inicio?
3. ¿Ruta permitirá stock negativo para tortilla/masa igual que POS?
4. ¿Raw materials pueden quedar en negativo con autorización?
5. ¿Toda devolución no vendible debe crear WasteRecord?
6. ¿Agua se controlará como insumo inventariable o solo informativo?
7. ¿Empaques se descuentan en producción o en venta?
8. ¿Las conversiones como cubeta serán por producto y organización?
9. ¿La tolerancia de rendimiento será global o configurable por organización?
10. ¿El cierre de producción requerirá PIN si hay variación alta?
```

---

## 15. Recomendación técnica final

La actualización debe entrar como cambio de núcleo, no como CRUD aislado de recetas.

Orden correcto:

```txt
Modelo de datos
→ InventoryLedgerService
→ RecipeService
→ ProductionRecipeService
→ API
→ Frontend
→ QA
→ Reportes
```

No se recomienda empezar por pantallas. Si el backend no centraliza reglas de inventario, el frontend terminará ocultando inconsistencias en lugar de resolverlas.

---

## 16. Riesgo principal

El riesgo más alto es introducir recetas sin que afecten realmente el inventario.

Una receta meramente visual no resuelve el problema operativo. Para que esta actualización sea útil, al cerrar un lote debe ocurrir lo siguiente:

```txt
Descontar insumos reales
Registrar movimientos de salida
Aumentar masa/tortilla producida
Registrar movimiento de entrada
Calcular rendimiento
Auditar el cierre
```

Si no se cumple eso, el módulo no debe considerarse terminado.
