# Tortilla Plus — Addendum UX Post R8 para Fuente de Verdad V0.1

**Documento base:** `docs/system-modules-and-flows-source-of-truth-v0.1.md`  
**Área:** UX/UI, producto, frontend  
**Estado:** Addendum oficial post R8  

---

## 1. Propósito

Este addendum complementa la fuente de verdad funcional del sistema con la dirección UX/UI post R8.

La fuente de verdad conserva los 17 módulos funcionales. Este addendum define cómo deben traducirse esos módulos a experiencia de usuario.

---

## 2. Decisión UX principal

La UI no debe mostrar los 17 módulos como navegación plana.

La UI debe agruparlos en áreas de trabajo:

```txt
Inicio
Mostrador
Producción
Inventario
Reparto
Clientes
Administración
Fiscal / Reportes
Configuración
```

---

## 3. Prioridad post R8

Antes de agregar nuevas reglas de negocio, el producto debe enfocarse en:

```txt
- navegación por áreas de trabajo
- panel del día
- POS teclado-first
- producción por receta guiada
- alertas operativas
- navegación por rol
- reportes accionables
- piloto controlado
```

---

## 4. Documentos UX oficiales

```txt
docs/ux/ux-ui-redesign-strategy-post-r8-v0.1.md
docs/ux/information-architecture-and-navigation-v0.1.md
docs/ux/operational-design-system-v0.1.md
docs/ux/critical-operational-flows-v0.1.md
docs/ux/p0-screen-specs-v0.1.md
docs/ux/ui-copy-and-domain-language-v0.1.md
docs/ux/ux-implementation-roadmap-post-r8-v0.1.md
```

---

## 5. Regla de implementación

Todo cambio UI post R8 debe cumplir estas reglas:

```txt
- mapearse a un área de trabajo UX
- respetar navegación por rol
- evitar lenguaje técnico visible
- mantener POS rápido
- mantener producción guiada
- mostrar alertas operativas
- conservar trazabilidad de inventario
```

---

## 6. Qué no debe hacerse todavía

No implementar estas deudas funcionales antes de piloto controlado:

```txt
- tolerancia configurable por organización
- agua inventariable
- flujo obligatorio masa -> tortilla
- descuento de empaques en venta
```

---

## 7. Criterio de aceptación

La experiencia post R8 será aceptable cuando:

```txt
- el usuario no tenga que navegar 17 módulos para operar
- el panel del día muestre estado real de operación
- el POS se pueda usar rápido con teclado
- producción por receta sea guiada paso a paso
- las alertas indiquen acciones concretas
- cada rol vea solo lo que necesita
```
