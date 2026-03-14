# Facturación DTE Online — Roadmap de Mejoras

## Estado del proyecto
**Sistema:** SaaS multi-tenant de facturación electrónica (DTE) para El Salvador
**Stack:** React + TypeScript (frontend) · Node.js + Express + PostgreSQL (backend)
**Objetivo:** 500+ empresas · 100,000 usuarios activos

---

## ✅ COMPLETADO — Todo el roadmap implementado

### FASE 0 — Bug crítico
- [x] **Fix inventario multi-tenant** — `descontarInventario` filtra por `tenant_id` correctamente
  en ambas ramas (lote específico y FIFO). Evita descontar stock del tenant equivocado.
  - `backend/src/services/facturacion.service.ts`

---

### FASE 1 — Seguridad
- [x] **FASE 1A — 2FA SuperAdmin con TOTP** (Google Authenticator / Authy)
  - Login de 2 pasos: credenciales → código de 6 dígitos
  - Secreto TOTP cifrado AES-256 en base de datos; token temporal `2fa-pending` de 5 min
  - Archivos: `backend/src/superadmin/totp.service.ts`, `frontend/src/superadmin/components/Setup2FAModal.tsx`

- [x] **FASE 1B — Rate limiting granular**
  - SuperAdmin login: 3 intentos / 15 min
  - Creación de facturas: 60 / 10 min · Descarga JSON DTE: 100 / 10 min
  - Archivos: `backend/src/middleware/rateLimiter.ts`

---

### FASE 2 — Monitoreo y operaciones
- [x] **FASE 2A — Sentry error tracking** (frontend + backend)
  - Desactivado en desarrollo; activo con `SENTRY_DSN` configurado
  - Captura errores con contexto de usuario y tenant; Error Boundary global en frontend
  - Paquetes: `@sentry/node`, `@sentry/profiling-node`, `@sentry/react`

- [x] **FASE 2B — Health check avanzado**
  - `GET /health` — público: DB ping, memoria, uptime
  - `GET /superadmin/health` — autenticado: pool stats, process, tenants activos
  - Frontend: `HealthPage.tsx` con 4 tarjetas, pool bar, heap bar, auto-refresh 30s
  - Archivos: `backend/src/superadmin/superadmin.controller.ts` (getHealth), `frontend/src/superadmin/pages/HealthPage.tsx`

- [x] **FASE 2C — Visor de auditoría en SuperAdmin**
  - `GET /superadmin/audit` con filtros dinámicos (acción, actor, tenant, fechas) y paginación
  - Tabla expandible: detalle JSON en bloque dark, AccionBadge, ActorBadge
  - Archivos: `frontend/src/superadmin/pages/AuditoriaPage.tsx`

---

### FASE 3 — Reportes ERP
- [x] **FASE 3A — Reportes de Ventas e Inventario**
  - Ventas: resumen del período, top clientes, top productos, distribución por tipo DTE
  - Inventario: stock valorizado, sin stock, lotes próximos a vencer
  - Exportación Excel con exceljs (3 hojas por reporte)
  - Archivos: `backend/src/controllers/reportes.controller.ts`, `frontend/src/components/Reportes/`

- [x] **FASE 3B — Reportes de Compras + exportación PDF**
  - Reporte por proveedor, gasto mensual comparativo
  - PDF profesional con `@react-pdf/renderer` (logo, datos fiscales)
  - Archivos: `frontend/src/components/Reportes/tabs/ComprasTab.tsx`, `frontend/src/components/Reportes/pdf/ComprasPDF.tsx`

---

### FASE 4 — Dashboard y notificaciones
- [x] **FASE 4A — Dashboard empresarial con KPIs**
  - Ventas del día/semana, facturas emitidas, productos con stock crítico, últimas 5 facturas
  - Gráficas con recharts: AreaChart de ventas, BarChart por categoría, PieChart por tipo DTE
  - Archivos: `backend/src/controllers/dashboard.controller.ts`, `frontend/src/components/Dashboard/index.tsx`
  - Paquete: `recharts`

- [x] **FASE 4B — Notificaciones en panel cliente**
  - 4 tipos: sin_stock (danger), por_vencer_urgente (danger), por_vencer_30 (warning), facturas_borrador (info)
  - Bell icon con badge en header; dropdown position:fixed; estado leído en localStorage
  - Auto-polling cada 5 minutos; sin nueva tabla (derivadas de DB existente)
  - Archivos: `frontend/src/components/NotificacionesBell.tsx`, `backend/src/controllers/notificaciones.controller.ts`

---

### FASE 5 — Panel SuperAdmin avanzado
- [x] **FASE 5A — Mapa de clientes por departamento**
  - Mapa interactivo de El Salvador con react-simple-maps v3.0.0
  - Marcadores proporcionales por total de tenants; tooltip en hover; ranking de 14 departamentos
  - Centroides de departamentos hardcoded; base cartográfica world-atlas via CDN
  - Archivos: `frontend/src/superadmin/pages/MapaClientesPage.tsx`

- [x] **FASE 5B/5C — Analytics MRR + alertas SuperAdmin**
  - 5 queries paralelas: ingresos 12m, nuevos tenants 12m, activaciones/suspensiones, por plan, por estado
  - AreaChart ingresos, BarChart nuevos/mes, BarChart apilado activaciones vs suspensiones
  - 2x PieChart donut: por estado + por plan; tabla resumen por plan con MRR
  - 5 KPI cards con TrendingUp/Down; KPIs derivados (crecimiento MoM, ingresoYTD)
  - Archivos: `frontend/src/superadmin/pages/AnalyticsPage.tsx`, `GET /superadmin/analytics`

---

### FASE 6 — POS mejorado
- [x] **FASE 6A — POS: trazabilidad de lotes y mejoras UX**
  - `lote_inventario_id` en `factura_detalles` — trazabilidad exacta del lote vendido
  - `crearDevolucion()` restaura stock al lote exacto (sin buscar el "más reciente")
  - HistorialPanel: resumen diario con total y breakdown por método de pago
  - Confirmación inline de devoluciones (reemplaza `window.confirm()`)
  - Botón de refresh + `useCallback` en cargarFacturas
  - Archivos: `backend/src/services/facturacion.service.ts`, `frontend/src/components/POS/index.tsx`

---

### FASE 7 — Inventario avanzado
- [x] **FASE 7A — Ajustes manuales, alertas de stock y kardex**
  - Nueva tabla: `movimientos_inventario` (tipo CHECK con 5 valores: merma/daño/robo/corrección+/corrección-)
  - Nueva columna: `productos.stock_minimo NUMERIC(12,3)`
  - `crearAjuste()` con transacción, validación de stock, registro de movimiento
  - `getKardex()` — UNION ALL de compras + ventas + devoluciones + ajustes con `SUM() OVER` para saldo acumulado
  - `getAlertasStock()` — HAVING stock < stock_minimo
  - Frontend tabulado: **Stock** (alertas collapsables, badges OK/Bajo mínimo/Sin stock) + **Kardex** (búsqueda con debounce, saldo acumulado) + **Ajustes** (formulario + guía lateral clickeable)
  - Archivos: `backend/src/services/inventario.service.ts`, `frontend/src/components/Inventario/`

---

### FASE 8 — Infraestructura
- [x] **FASE 8A — Backup automático de base de datos**
  - `pg_dump` diario a las 02:00 hora El Salvador, comprimido con gzip
  - Backup de directorio `/uploads`; retención de 30 días (limpieza automática)
  - Alerta en `audit_log` si el backup falla (`BACKUP_FALLIDO` / `BACKUP_EXITOSO`)
  - `GET /superadmin/system/backups` — historial; `POST /superadmin/system/backups/run` — trigger manual (202 Accepted)
  - Frontend: `BackupPage.tsx` con 4 StatCards + tabla de historial + botón de backup manual
  - Archivos: `backend/src/utils/backup.ts`, `backend/src/jobs/backup.job.ts`, `frontend/src/superadmin/pages/BackupPage.tsx`
  - Env vars opcionales: `BACKUP_DIR` (default: `../backups`), `BACKUP_RETENTION_DAYS` (default: 30)

---

## 📦 PAQUETES INSTALADOS

```bash
# Backend
exceljs, speakeasy, qrcode
@sentry/node, @sentry/profiling-node
node-cron (ya incluido en instalación inicial)

# Backend (dev)
@types/speakeasy, @types/qrcode

# Frontend
@sentry/react
@react-pdf/renderer
recharts
react-simple-maps
```

### Variables de entorno opcionales

**`backend/.env`**
```
SENTRY_DSN=https://tu-dsn@sentry.io/proyecto
BACKUP_DIR=../backups
BACKUP_RETENTION_DAYS=30
```

**`frontend/.env`**
```
VITE_SENTRY_DSN=https://tu-dsn@sentry.io/proyecto
```

---

## 📋 ESTADO FINAL

| Fase | Descripción | Estado |
|------|-------------|--------|
| **0** | Fix inventario multi-tenant | ✅ Completado |
| **1A** | 2FA TOTP SuperAdmin | ✅ Completado |
| **1B** | Rate limiting granular | ✅ Completado |
| **2A** | Sentry error tracking | ✅ Completado |
| **2B** | Health check avanzado | ✅ Completado |
| **2C** | Visor de auditoría SuperAdmin | ✅ Completado |
| **3A** | Reportes Ventas + Inventario + Excel | ✅ Completado |
| **3B** | Reportes Compras + PDF | ✅ Completado |
| **4A** | Dashboard ERP con KPIs + recharts | ✅ Completado |
| **4B** | Notificaciones en panel cliente | ✅ Completado |
| **5A** | Mapa de clientes (react-simple-maps) | ✅ Completado |
| **5B/5C** | Analytics MRR + alertas SuperAdmin | ✅ Completado |
| **6A** | POS mejorado (trazabilidad lotes + UX) | ✅ Completado |
| **7A** | Inventario avanzado (kardex + ajustes + alertas) | ✅ Completado |
| **8A** | Backup automático de base de datos | ✅ Completado |

**🎉 Roadmap 100% completado.**

---

## 🔐 CREDENCIALES POR DEFECTO

> ⚠️ Cambiar antes de ir a producción

| Panel | URL | Usuario | Contraseña |
|-------|-----|---------|------------|
| Empresa (ERP) | `http://localhost:3000/login` | `admin` | `admin123` |
| Administrador | `http://localhost:3000/superadmin/login` | `superadmin` | `superadmin123` |

---

## 🚀 COMANDOS DE DESARROLLO

```bash
# Backend (puerto 3001)
cd backend && npm run dev

# Frontend (puerto 3000)
cd frontend && npm run dev
```
